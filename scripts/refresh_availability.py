#!/usr/bin/env python3
"""Generate advising/availability.json from a published Outlook .ics feed.

Reads the declared advising hours in advising/config.json, subtracts everything
that is busy on the calendar, and writes out the remaining open slots.

Only free/busy *times* are ever written to the JSON. Event titles, attendees and
locations are read and discarded, so nothing private lands in the public repo.

Usage:
    ICS_URL="https://outlook.office365.com/owa/calendar/.../calendar.ics" \\
        python3 scripts/refresh_availability.py

    python3 scripts/refresh_availability.py --ics-file test.ics   # local testing
    python3 scripts/refresh_availability.py --no-fetch            # hours only
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "advising" / "config.json"
OUTPUT_PATH = ROOT / "advising" / "availability.json"


def load_config() -> dict:
    with CONFIG_PATH.open() as fh:
        return json.load(fh)


def fetch_ics(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "advising-availability/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def busy_intervals(raw: bytes, start: datetime, end: datetime, tz: ZoneInfo,
                   all_day_blocks: bool) -> list[tuple[datetime, datetime]]:
    """Expand the calendar over [start, end] and return busy (start, end) pairs."""
    cal = icalendar.Calendar.from_ical(raw)
    events = recurring_ical_events.of(cal).between(start, end)

    intervals: list[tuple[datetime, datetime]] = []
    for ev in events:
        if str(ev.get("STATUS", "")).upper() == "CANCELLED":
            continue
        # TRANSPARENT means "show me as free" — respect it.
        if str(ev.get("TRANSP", "")).upper() == "TRANSPARENT":
            continue
        # Declined invitations should not block time.
        if str(ev.get("PARTSTAT", "")).upper() == "DECLINED":
            continue

        dtstart = ev.get("DTSTART").dt
        dtend_prop = ev.get("DTEND")
        dtend = dtend_prop.dt if dtend_prop is not None else None

        is_all_day = isinstance(dtstart, date) and not isinstance(dtstart, datetime)
        if is_all_day:
            if not all_day_blocks:
                # All-day items on an academic calendar are usually banners
                # ("Registration Day"), not commitments. Skip unless asked.
                continue
            day_end = dtend if isinstance(dtend, date) else dtstart + timedelta(days=1)
            s = datetime.combine(dtstart, time.min, tzinfo=tz)
            e = datetime.combine(day_end, time.min, tzinfo=tz)
        else:
            s = dtstart if dtstart.tzinfo else dtstart.replace(tzinfo=tz)
            if dtend is None:
                e = s + timedelta(minutes=30)
            else:
                e = dtend if dtend.tzinfo else dtend.replace(tzinfo=tz)

        if e > s:
            intervals.append((s.astimezone(tz), e.astimezone(tz)))

    return merge(intervals)


def merge(intervals: list[tuple[datetime, datetime]]) -> list[tuple[datetime, datetime]]:
    if not intervals:
        return []
    intervals = sorted(intervals)
    merged = [intervals[0]]
    for s, e in intervals[1:]:
        last_s, last_e = merged[-1]
        if s <= last_e:
            merged[-1] = (last_s, max(last_e, e))
        else:
            merged.append((s, e))
    return merged


def candidate_slots(cfg: dict, tz: ZoneInfo, now: datetime) -> list[tuple[datetime, datetime]]:
    """Every slot the declared advising hours allow, before busy time is removed."""
    length = timedelta(minutes=cfg["meeting_minutes"])
    step = timedelta(minutes=cfg.get("slot_step_minutes", cfg["meeting_minutes"]))

    # Two ways to bound the window:
    #   end_date    a fixed last day — the window stops there and stays put,
    #               however many times this script re-runs.
    #   horizon_days a rolling window, always N days from today. Used only when
    #               end_date is unset.
    if cfg.get("end_date"):
        last_day = date.fromisoformat(cfg["end_date"])
    else:
        last_day = (now + timedelta(days=cfg["horizon_days"])).date()

    # Run to the *end* of the last day, not to this time of day on that day —
    # otherwise the final afternoon disappears whenever the script runs in the
    # morning.
    horizon = datetime.combine(last_day, time.max, tzinfo=tz)

    # Never offer a day before today, even if start_date is in the past.
    first_day = now.date()
    if cfg.get("start_date"):
        first_day = max(first_day, date.fromisoformat(cfg["start_date"]))

    earliest = now + timedelta(hours=cfg.get("min_notice_hours", 0))
    blackout = set(cfg.get("blackout_dates", []))

    slots: list[tuple[datetime, datetime]] = []
    day = first_day
    while day <= horizon.date():
        if day.isoformat() in blackout:
            day += timedelta(days=1)
            continue
        for window in cfg["hours"].get(str(day.isoweekday()), []):
            w_start = datetime.combine(day, time.fromisoformat(window[0]), tzinfo=tz)
            w_end = datetime.combine(day, time.fromisoformat(window[1]), tzinfo=tz)
            cursor = w_start
            while cursor + length <= w_end:
                if cursor >= earliest and cursor + length <= horizon:
                    slots.append((cursor, cursor + length))
                cursor += step
        day += timedelta(days=1)
    return slots


def blackout_ranges(cfg: dict, tz: ZoneInfo) -> list[tuple[datetime, datetime]]:
    """One-off blocks of unavailable time from config.

    Two accepted spellings, both local to the configured timezone:
        ["2026-09-03", "10:00", "12:00"]                  date, start, end
        ["2026-09-03T10:00", "2026-09-03T12:00"]          full timestamps
    """
    out: list[tuple[datetime, datetime]] = []
    for i, r in enumerate(cfg.get("blackout_ranges", [])):
        try:
            if len(r) == 3:
                day = date.fromisoformat(r[0])
                start = datetime.combine(day, time.fromisoformat(r[1]), tzinfo=tz)
                end = datetime.combine(day, time.fromisoformat(r[2]), tzinfo=tz)
            elif len(r) == 2:
                start, end = (datetime.fromisoformat(x) for x in r)
                start = start if start.tzinfo else start.replace(tzinfo=tz)
                end = end if end.tzinfo else end.replace(tzinfo=tz)
            else:
                raise ValueError("expected 2 or 3 entries")
        except (ValueError, TypeError) as exc:
            raise SystemExit(
                f"blackout_ranges[{i}] = {r!r} is not valid ({exc}). Use "
                f'["YYYY-MM-DD", "HH:MM", "HH:MM"] or two full timestamps.'
            )
        if end <= start:
            raise SystemExit(f"blackout_ranges[{i}] = {r!r} ends before it starts.")
        out.append((start, end))
    return merge(out)


def is_free(slot: tuple[datetime, datetime], busy: list[tuple[datetime, datetime]],
            buffer_min: int) -> bool:
    pad = timedelta(minutes=buffer_min)
    s, e = slot[0] - pad, slot[1] + pad
    for b_start, b_end in busy:
        if b_start < e and s < b_end:
            return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ics-file", help="read a local .ics instead of fetching")
    parser.add_argument("--no-fetch", action="store_true",
                        help="skip the calendar entirely (declared hours only)")
    parser.add_argument("--now", help="ISO timestamp to treat as 'now' (testing)")
    args = parser.parse_args()

    cfg = load_config()
    tz = ZoneInfo(cfg["timezone"])
    now = (datetime.fromisoformat(args.now).astimezone(tz) if args.now
           else datetime.now(tz))

    if cfg.get("end_date") and date.fromisoformat(cfg["end_date"]) < now.date():
        print(f"WARNING: end_date {cfg['end_date']} has passed — the page will "
              f"show no open times. Move it, or clear it to go back to a "
              f"rolling {cfg['horizon_days']}-day window.", file=sys.stderr)

    slots = candidate_slots(cfg, tz, now)
    window_start = min((s for s, _ in slots), default=now)
    window_end = max((e for _, e in slots), default=now + timedelta(days=1))

    busy: list[tuple[datetime, datetime]] = []
    source = "none"
    if args.ics_file:
        busy = busy_intervals(Path(args.ics_file).read_bytes(), window_start, window_end,
                              tz, cfg.get("all_day_blocks", False))
        source = "file"
    elif not args.no_fetch:
        url = os.environ.get("ICS_URL")
        if not url:
            print("ICS_URL is not set. Refusing to publish availability that ignores "
                  "your calendar — pass --no-fetch if that is really what you want.",
                  file=sys.stderr)
            return 1
        busy = busy_intervals(fetch_ics(url), window_start, window_end, tz,
                              cfg.get("all_day_blocks", False))
        source = "outlook"

    buffer_min = cfg.get("buffer_minutes", 0)
    # Calendar events get the buffer padding; hand-entered blackouts are taken
    # literally, so "unavailable 1-2" blocks exactly 1-2 and nothing either side.
    manual = blackout_ranges(cfg, tz)
    free = [s for s in slots
            if is_free(s, busy, buffer_min) and is_free(s, manual, 0)]

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "timezone": cfg["timezone"],
        "meeting_minutes": cfg["meeting_minutes"],
        "busy_source": source,
        "slots": [s.isoformat() for s, _ in free],
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"{len(free)} open slots from {len(slots)} candidates "
          f"({len(busy)} busy blocks from {source}, "
          f"{len(manual)} hand-entered blackout ranges)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
