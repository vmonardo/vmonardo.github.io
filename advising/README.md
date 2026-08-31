# Advising booking page

A self-hosted booking page for `vmonardo.github.io/advising/`. Students see only
your open times; the page never exposes what is on your calendar or who else has
booked.

## How it fits together

```
Outlook calendar (.ics feed)
        |
        v  GitHub Action, every 30 min
scripts/refresh_availability.py  ->  advising/availability.json  (committed)
        |
        v  read by the browser
advising/index.html   --- booking --->   Apps Script web app
                       (or mailto,        -> Google Sheet + invite sent as you
                        if no backend
                        yet)             [ worker/ is an equivalent Cloudflare
                                           backend, same protocol ]
```

Nothing here needs a server you maintain. The three stages below are meant to be
done in order, and the page is genuinely usable after stage 1.

---

## Stage 1 — put the page up (10 minutes, no accounts)

1. Edit `advising/config.json` so `hours` matches when you actually want to be
   bookable. Keys are ISO weekdays (`1` = Monday). Everything else has a sane
   default.
2. Commit and push. The page is live at `https://vmonardo.github.io/advising/`.
3. Add a link on your homepage — one line in `index.html`, wherever it fits:

   ```html
   <p> <a href="advising/">Book advising time</a> </p>
   ```

At this stage `booking_endpoint` is empty, so the **Book** button opens the
student's mail client with the time, their name and their notes already filled
in. You confirm by hand. Not automatic, but it is one click for them and the
times shown are still yours.

To generate a first `availability.json` without any calendar:

```bash
python3 scripts/refresh_availability.py --no-fetch
```

## Stage 2 — make it follow your real calendar (20 minutes)

1. In Outlook on the web: **Settings → Calendar → Shared calendars → Publish a
   calendar**. Publish your main calendar and — this matters — choose
   **"Can view when I'm busy"**, not the option that shares full details. Copy
   the **ICS** link.

   That URL is a bearer secret: anyone holding it can read the feed. Publishing
   availability-only means a leak exposes busy blocks and nothing else.

2. In the repo on GitHub: **Settings → Secrets and variables → Actions → New
   repository secret**, named `OUTLOOK_ICS_URL`, with that link as the value.

   Never commit the URL. This repo is public.

3. **Actions → Refresh advising availability → Run workflow** to test it now.
   After that it runs every 30 minutes on its own.

If MIT's tenant has calendar publishing disabled, the script also takes
`--ics-file`, so you can run it on your laptop against an exported `.ics` and
push the result.

### Blocking time by hand

For time you are unavailable but do not want on your Outlook calendar, use
`blackout_ranges` in `advising/config.json`:

```json
"blackout_ranges": [
  ["2026-09-03", "10:00", "12:00"],
  ["2026-09-03", "14:00", "15:00"]
]
```

Date, start, end — local time, end exclusive, so `13:00`-`14:00` removes the
1:00 and 1:30 slots and leaves 2:00 bookable. Two full timestamps
(`["2026-09-03T10:00", "2026-09-03T12:00"]`) also work if a block spans midnight.

Unlike calendar events these are taken literally: `buffer_minutes` is *not*
applied, so a block removes exactly what you asked for and nothing either side.
`blackout_dates` remains the way to remove a whole day.

Stale entries are harmless — a range in the past matches no upcoming slot — but
worth clearing out occasionally.

What the generator does with your calendar: it skips events marked *free*,
declined invitations, and cancelled events; it ignores all-day items by default
(academic calendars are full of all-day banners that are not commitments — set
`all_day_blocks: true` if yours are real); and it pads every busy block by
`buffer_minutes` so you are not booked wall-to-wall.

## Stage 3 — real booking, no email round-trip (about 30 minutes)

The student picks a time and is done. No email to you, no confirmation step.
The backend lives in `appsscript/Code.gs` and runs as a Google Apps Script web
app, which means the invite is sent **from your own Google address** — no domain
to buy, no mail provider, no card on file.

(Why not send as `monardo@mit.edu`? You cannot add MIT's DNS records, so mail
claiming to be from that address fails SPF and lands in spam. Apps Script sends
as an address you genuinely control, with `reply_to` pointed at your MIT
address, which is the honest version of the same thing.)

**Which Google account to use.** Not your MIT one. MIT's Google Workspace does
not include Gmail (IS&T: "Gmail, YouTube, and Google Groups are not provided"),
so there is no mail service for the script to send through, and the
authorization fails with a 400 before it ever gets to a consent screen. Use a
personal Google account. Invites then arrive from that address with `reply_to`
set to `monardo@mit.edu`, and the footer of the student email says so, so it
does not read as spoofed.

1. Sign in to [script.google.com](https://script.google.com) **with your
   personal Google account** — use a private window if you are also signed in
   as MIT, since a mixed session is what produces the 400.
2. **New project**, and paste the contents of `appsscript/Code.gs` over the
   empty `Code.gs`.
3. Save (disk icon, or Cmd-S) — the function list stays empty until you do.
   Then run `setup` once:

   - In the toolbar, pick **setup** from the function dropdown (next to
     *Debug* and *Run*), then click **Run**.
   - **Authorization required** → *Review permissions* → pick the personal
     account.
   - **"Google hasn't verified this app"** is expected; personal scripts never
     go through Google's review. Click **Advanced** → **Go to <project name>
     (unsafe)** → **Allow**.
   - The **Execution log** then prints the bookings spreadsheet URL, the
     sending address, and how many slots your site publishes. Keep that
     spreadsheet link. If the log instead says *"This project requires access
     to your Google Account"*, the authorization did not complete — the grant
     was never recorded, so try again in a clean private window.

4. Run **sendTestInvite** the same way. It mails you both halves of a real
   booking, both addressed to you. Check that it arrives, and that in Outlook
   the attachment offers **Accept / Decline** rather than downloading as a
   plain file — that is how you know the invite reaches your calendar.

5. **Deploy → New deployment → Web app**, with:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**

   "Anyone" is required — students are not signed in to your Google account.
   The script still only accepts times you have published and addresses in your
   allowed domain.

6. Copy the `/exec` URL into `booking_endpoint` in `advising/config.json`, then
   commit and push.

That is it. Bookings land in the spreadsheet, both of you get the invite, and
the page starts greying out times that are already taken.

**Sending limits.** A consumer `gmail.com` account gets 100 recipients/day.
Each booking sends two emails, so that is 50 bookings a day — far more than
advising needs.

**When you change the deployed code**, use *Deploy → Manage deployments → Edit →
Version: New version*. Creating a *new deployment* instead gives you a different
`/exec` URL, and the page will keep calling the old one.

### The other option: Cloudflare Worker

`worker/` holds an equivalent backend for Cloudflare — D1 for storage, Resend
for mail. It speaks the same protocol, so `booking_endpoint` can point at either
one. It is the better choice if you ever want this on a real domain, and it
needs one: Resend will only send to your own address until you verify a domain
you own.

```bash
cd worker
npm install -g wrangler
wrangler login
wrangler d1 create advising           # copy the database_id into wrangler.toml
wrangler d1 execute advising --remote --file=schema.sql
wrangler deploy
wrangler secret put RESEND_API_KEY
```

### What protects this page

- Bookings are keyed on the slot's primary key in D1, so two students clicking
  the same time at the same instant cannot both succeed — the second gets a 409
  and is asked to pick again.
- The Worker re-checks every request against the published `availability.json`,
  so no one can POST an arbitrary timestamp onto your calendar.
- Only `mit.edu` addresses can book (`ALLOWED_EMAIL_DOMAIN`), capped at 3
  bookings per address per day.
- CORS is limited to your site's origin.

### Cancelling

There is no cancel flow yet — students reply to the confirmation email and you
delete the row:

```bash
wrangler d1 execute advising --remote \
  --command "DELETE FROM bookings WHERE email='someone@mit.edu'"
```

Worth adding a signed cancel link before this sees heavy use.
