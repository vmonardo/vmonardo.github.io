/**
 * Booking backend for the advising page.
 *
 * Two routes:
 *   GET  /taken  -> ["2026-09-08T10:00:00-04:00", ...]   slots already claimed
 *   POST /book   -> { ok: true } | 409 if the slot went while they were typing
 *
 * The double-booking guarantee comes from D1: `slot` is the PRIMARY KEY, so a
 * second INSERT for the same instant fails at the database, not in application
 * logic. Two students clicking at once cannot both win.
 */

const ok = (body, env, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env) },
  });

const cors = (env) => ({
  "Access-Control-Allow-Origin": env.SITE_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    // Same protocol the Apps Script backend speaks, so advising/index.html can
    // point at either one without changes.
    if (request.method === "GET" &&
        (url.pathname === "/taken" || url.searchParams.get("action") === "taken")) {
      const { results } = await env.DB.prepare(
        "SELECT slot FROM bookings WHERE slot > datetime('now')"
      ).all();
      return ok({ taken: results.map((r) => r.slot) }, env);
    }

    if (request.method === "POST") {
      return book(request, env);
    }

    return ok({ error: "not found" }, env, 404);
  },
};

async function book(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return ok({ error: "bad request" }, env, 400);
  }

  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 160);
  const topic = String(body.topic || "").trim().slice(0, 1000);
  const slot = String(body.slot || "").trim();

  if (!name || !email || !slot) {
    return ok({ error: "name, email and slot are required" }, env, 400);
  }

  // Only people with an address in the allowed domain can book. This is the
  // whole spam defence: a public form with no check will find bots.
  const domain = env.ALLOWED_EMAIL_DOMAIN || "mit.edu";
  if (!new RegExp(`^[^@\\s]+@([a-z0-9-]+\\.)*${domain.replace(".", "\\.")}$`).test(email)) {
    return ok({ error: `Please book with an ${domain} address.` }, env, 400);
  }

  // The slot must be one the published schedule actually offers. Without this,
  // anyone can POST an arbitrary timestamp and land on the calendar.
  const avail = await fetch(`${env.SITE_ORIGIN}/advising/availability.json`, {
    cf: { cacheTtl: 60 },
  }).then((r) => r.json());
  if (!avail.slots.includes(slot)) {
    return ok({ error: "That time is no longer open.", conflict: true }, env, 409);
  }
  if (new Date(slot) < new Date()) {
    return ok({ error: "That time is in the past.", conflict: true }, env, 409);
  }

  // Light abuse cap: no one needs to book four meetings in a day.
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM bookings WHERE email = ? AND created_at > datetime('now', '-1 day')"
  ).bind(email).first();
  if (recent && recent.n >= 3) {
    return ok({ error: "That is a lot of bookings — email me instead." }, env, 429);
  }

  const durationMin = Number(env.MEETING_MINUTES || 30);
  const uid = `${crypto.randomUUID()}@advising`;

  try {
    await env.DB.prepare(
      `INSERT INTO bookings (slot, name, email, topic, uid, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(slot, name, email, topic, uid).run();
  } catch (e) {
    // UNIQUE constraint on the primary key: someone else got there first.
    if (String(e).includes("UNIQUE")) {
      return ok({ error: "Someone just took that slot.", conflict: true }, env, 409);
    }
    throw e;
  }

  const ics = buildIcs({ slot, durationMin, name, email, topic, uid, env });
  await notify({ ics, name, email, slot, topic, env });

  return ok({ ok: true }, env);
}

/* ---------------------------------------------------------------- calendar */

// RFC 5545 wants CRLF and lines folded at 75 *octets* — not characters. An
// accented name is multi-byte, so folding on .length can overrun the limit and
// split a character in half. Count encoded bytes and break on code points.
function fold(line) {
  const enc = new TextEncoder();
  const out = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > 74) {
      out.push(cur);
      cur = " " + ch;
      bytes = 1 + n;
    } else {
      cur += ch;
      bytes += n;
    }
  }
  out.push(cur);
  return out.join("\r\n");
}

const esc = (s) =>
  String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;")
    .replace(/,/g, "\\,").replace(/\n/g, "\\n");

const utc = (d) =>
  d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function buildIcs({ slot, durationMin, name, email, topic, uid, env }) {
  const start = new Date(slot);
  const end = new Date(start.getTime() + durationMin * 60000);
  const organizer = env.SENDER_EMAIL;
  const title = (env.MEETING_TITLE || "Advising: {student} + {organizer}")
    .replace("{student}", name)
    .replace("{organizer}", env.ORGANIZER_NAME || "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//vmonardo.github.io//advising//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    fold(`SUMMARY:${esc(title)}`),
    fold(`LOCATION:${esc(env.MEETING_LOCATION || "")}`),
    fold(`DESCRIPTION:${esc(topic ? `What ${name} would like to cover:\n${topic}` : "Advising meeting.")}`),
    `ORGANIZER;CN=${esc(env.ORGANIZER_NAME || "")}:mailto:${organizer}`,
    fold(`ATTENDEE;CN=${esc(name)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${email}`),
    fold(`ATTENDEE;CN=${esc(env.ORGANIZER_NAME || "")};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${env.ORGANIZER_EMAIL}`),
    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

/* ------------------------------------------------------------------- email */

async function notify({ ics, name, email, slot, topic, env }) {
  if (!env.RESEND_API_KEY) {
    // No mail provider configured yet — the booking is still recorded, and the
    // /taken endpoint will keep the slot from being handed out twice.
    console.log("booking recorded, no mail provider configured", { slot, email });
    return;
  }

  const when = new Date(slot).toLocaleString("en-US", {
    timeZone: env.DISPLAY_TIMEZONE || "America/New_York",
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
  const attachment = {
    filename: "advising.ics",
    content: btoa(unescape(encodeURIComponent(ics))),
    content_type: "text/calendar; method=REQUEST",
  };

  const send = (to, subject, html) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${env.ORGANIZER_NAME} <${env.SENDER_EMAIL}>`,
        reply_to: env.ORGANIZER_EMAIL,
        to: [to],
        subject,
        html,
        attachments: [attachment],
      }),
    });

  await Promise.all([
    send(email, `Advising meeting confirmed — ${when}`,
      `<p>Hi ${escapeHtml(name.split(" ")[0])},</p>
       <p>You are booked for <strong>${escapeHtml(when)}</strong>${
         env.MEETING_LOCATION ? ` in ${escapeHtml(env.MEETING_LOCATION)}` : ""
       }. The invite is attached.</p>
       <p>If you need to cancel, just reply to this email.</p>
       <p>— ${escapeHtml(env.ORGANIZER_NAME)}</p>`),
    send(env.ORGANIZER_EMAIL, `Advising booked: ${name} — ${when}`,
      `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) booked ${escapeHtml(when)}.</p>
       ${topic ? `<p>Wants to cover:<br>${escapeHtml(topic).replace(/\n/g, "<br>")}</p>` : ""}`),
  ]);
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export { buildIcs, fold, esc };
