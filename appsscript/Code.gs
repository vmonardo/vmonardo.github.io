/**
 * Booking backend for https://vmonardo.github.io/advising/
 *
 * Deployed as a Google Apps Script web app running as you, so the confirmation
 * and the calendar invite are sent from your own Google address — no domain to
 * buy, no mail provider, no card on file.
 *
 * Settings are read from the site's own config.json, so this file never needs
 * editing when you change your hours, meeting length or location.
 *
 * Routes (Apps Script has no path routing, so these are query params):
 *   GET  ?action=taken  -> ["2026-09-08T10:00:00-04:00", ...]
 *   POST body {action:"book", slot, name, email, topic}
 *
 * Setup is in advising/README.md.
 */

var SITE = 'https://vmonardo.github.io';
var CONFIG_URL = SITE + '/advising/config.json';
var AVAIL_URL = SITE + '/advising/availability.json';
var SHEET_NAME = 'Advising bookings';

/* ------------------------------------------------------------------ routes */

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'taken') {
    return json({ taken: takenSlots() });
  }
  return json({ error: 'not found' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action !== 'book') return json({ error: 'not found' });
    return json(book(body));
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ----------------------------------------------------------------- storage */

function sheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (err) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    ss.getActiveSheet()
      .appendRow(['slot', 'name', 'email', 'topic', 'uid', 'created_at']);
    props.setProperty('SHEET_ID', ss.getId());
  }
  return ss.getActiveSheet();
}

function rows() {
  var values = sheet().getDataRange().getValues();
  return values.slice(1).map(function (r) {
    return { slot: String(r[0]), name: r[1], email: String(r[2]), created_at: r[5] };
  });
}

function takenSlots() {
  var now = new Date();
  return rows()
    .filter(function (r) { return new Date(r.slot) > now; })
    .map(function (r) { return r.slot; });
}

/* ----------------------------------------------------------------- booking */

function book(body) {
  var cfg = fetchJson(CONFIG_URL);

  var name = String(body.name || '').trim().slice(0, 120);
  var email = String(body.email || '').trim().toLowerCase().slice(0, 160);
  var topic = String(body.topic || '').trim().slice(0, 1000);
  var slot = String(body.slot || '').trim();

  if (!name || !email || !slot) return { error: 'Name, email and time are required.' };

  var domain = cfg.allowed_email_domain || 'mit.edu';
  var pattern = new RegExp('^[^@\\s]+@([a-z0-9-]+\\.)*' + domain.replace('.', '\\.') + '$');
  if (!pattern.test(email)) return { error: 'Please book with an ' + domain + ' address.' };

  // The slot has to be one the published schedule actually offers, or anyone
  // could POST an arbitrary timestamp onto the calendar.
  var avail = fetchJson(AVAIL_URL);
  if (avail.slots.indexOf(slot) === -1) {
    return { error: 'That time is no longer open.', conflict: true };
  }
  if (new Date(slot) < new Date()) {
    return { error: 'That time is in the past.', conflict: true };
  }

  var uid = Utilities.getUuid() + '@advising';
  var lock = LockService.getScriptLock();

  // Real mutual exclusion: two students submitting the same instant queue here,
  // and the second one sees the first one's row.
  try {
    lock.waitLock(15000);
  } catch (err) {
    return { error: 'Busy right now — please try that again.' };
  }

  try {
    var existing = rows();
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].slot === slot) {
        return { error: 'Someone just took that slot.', conflict: true };
      }
    }
    var dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    var recent = existing.filter(function (r) {
      return r.email === email && new Date(r.created_at) > dayAgo;
    });
    if (recent.length >= 3) {
      return { error: 'That is a lot of bookings — email me instead.' };
    }

    sheet().appendRow([slot, name, email, topic, uid, new Date().toISOString()]);
  } finally {
    lock.releaseLock();
  }

  notify(cfg, { slot: slot, name: name, email: email, topic: topic, uid: uid });
  return { ok: true };
}

/* ------------------------------------------------------------------- email */

function notify(cfg, b) {
  var tz = cfg.timezone || 'America/New_York';
  var when = Utilities.formatDate(new Date(b.slot), tz, "EEEE, MMMM d 'at' h:mm a z");
  var ics = buildIcs(cfg, b);
  var attachment = Utilities.newBlob(ics, 'text/calendar; method=REQUEST', 'advising.ics');
  var organizerName = cfg.organizer_name || 'Vince Monardo';
  var replyTo = cfg.organizer_email;
  var where = cfg.meeting_location ? ' in ' + cfg.meeting_location : '';

  MailApp.sendEmail({
    to: b.email,
    replyTo: replyTo,
    name: organizerName,
    subject: 'Advising meeting confirmed — ' + when,
    htmlBody:
      '<p>Hi ' + escapeHtml(b.name.split(' ')[0]) + ',</p>' +
      '<p>You are booked for <strong>' + escapeHtml(when) + '</strong>' +
      escapeHtml(where) + '. The invite is attached.</p>' +
      '<p>If you need to cancel, just reply to this email.</p>' +
      '<p>— ' + escapeHtml(organizerName) + '</p>' +
      // MIT Google accounts have no Gmail service, so this is sent from a
      // personal address. Saying so plainly keeps it from reading as spoofed.
      '<hr><p style="font-size:12px;color:#666">Sent by the booking page on ' +
      escapeHtml(SITE.replace('https://', '')) + '. Replies go to ' +
      escapeHtml(replyTo) + '.</p>',
    attachments: [attachment],
  });

  MailApp.sendEmail({
    to: replyTo,
    name: 'Advising bookings',
    subject: 'Advising booked: ' + b.name + ' — ' + when,
    htmlBody:
      '<p><strong>' + escapeHtml(b.name) + '</strong> (' + escapeHtml(b.email) +
      ') booked ' + escapeHtml(when) + '.</p>' +
      (b.topic ? '<p>Wants to cover:<br>' +
        escapeHtml(b.topic).replace(/\n/g, '<br>') + '</p>' : ''),
    attachments: [attachment],
  });
}

/* ---------------------------------------------------------------- calendar */

// UTF-8 byte length of one code point. Apps Script's V8 runtime has no
// TextEncoder, and RFC 5545 folds on octets, not characters.
function byteLen(ch) {
  var c = ch.codePointAt(0);
  if (c < 0x80) return 1;
  if (c < 0x800) return 2;
  if (c < 0x10000) return 3;
  return 4;
}

function fold(line) {
  var out = [];
  var cur = '';
  var bytes = 0;
  for (var ch of line) {
    var n = byteLen(ch);
    if (bytes + n > 74) {
      out.push(cur);
      cur = ' ' + ch;
      bytes = 1 + n;
    } else {
      cur += ch;
      bytes += n;
    }
  }
  out.push(cur);
  return out.join('\r\n');
}

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;')
    .replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function utcStamp(d) {
  return Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'");
}

function buildIcs(cfg, b) {
  var start = new Date(b.slot);
  var end = new Date(start.getTime() + (cfg.meeting_minutes || 30) * 60000);
  var organizerName = cfg.organizer_name || '';
  var me = Session.getEffectiveUser().getEmail();
  var title = (cfg.meeting_title || 'Advising: {student} + {organizer}')
    .replace('{student}', b.name)
    .replace('{organizer}', organizerName);
  var description = b.topic
    ? 'What ' + b.name + ' would like to cover:\n' + b.topic
    : 'Advising meeting.';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//vmonardo.github.io//advising//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    'UID:' + b.uid,
    'DTSTAMP:' + utcStamp(new Date()),
    'DTSTART:' + utcStamp(start),
    'DTEND:' + utcStamp(end),
    fold('SUMMARY:' + esc(title)),
    fold('LOCATION:' + esc(cfg.meeting_location || '')),
    fold('DESCRIPTION:' + esc(description)),
    fold('ORGANIZER;CN=' + esc(organizerName) + ':mailto:' + me),
    fold('ATTENDEE;CN=' + esc(b.name) +
      ';ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:' + b.email),
    fold('ATTENDEE;CN=' + esc(organizerName) +
      ';ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:' + cfg.organizer_email),
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';
}

/* ------------------------------------------------------------------ helpers */

function fetchJson(url) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(url);
  if (hit) return JSON.parse(hit);

  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() === 404) {
    throw new Error(
      url + ' returned 404. The site has not been published yet — commit and ' +
      'push the repo, wait for the GitHub Pages build to finish, then run this ' +
      'again. This backend reads your hours and open slots from the live site, ' +
      'so it cannot do anything until that page exists.');
  }
  if (resp.getResponseCode() !== 200) {
    throw new Error(url + ' returned HTTP ' + resp.getResponseCode() + '.');
  }
  var text = resp.getContentText();
  cache.put(url, text, 60);
  return JSON.parse(text);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/**
 * Run this after `setup`, before deploying. It sends you the exact pair of
 * emails a real booking produces — the student's copy and your notification —
 * both addressed to you, so nobody else sees a test.
 *
 * The point is to confirm two things that are not obvious from the code:
 * that your account can send mail at all, and that the attached invite opens
 * as a real meeting request in Outlook rather than as a stray file.
 */
function sendTestInvite() {
  var cfg = fetchJson(CONFIG_URL);
  var me = Session.getEffectiveUser().getEmail();
  var slot = new Date(Date.now() + 24 * 3600 * 1000);
  slot.setMinutes(0, 0, 0);

  Logger.log('Sending as: %s', me);
  Logger.log('Student copy -> %s', me);
  Logger.log('Your copy    -> %s', cfg.organizer_email);

  notify(cfg, {
    slot: slot.toISOString(),
    name: 'Test Student',
    email: me,
    topic: 'This is a test booking — no student sent this.',
    uid: Utilities.getUuid() + '@advising-test',
  });

  Logger.log('Sent. Check both inboxes. In Outlook the attachment should offer '
    + 'Accept / Decline, not just download as a file.');
  Logger.log('Remaining daily email quota: %s', MailApp.getRemainingDailyQuota());
}

/**
 * Run this once from the editor before deploying. It triggers the permission
 * prompts (Sheets, Gmail, external fetch) and creates the bookings sheet, so
 * the first real student is not the one who discovers a missing authorization.
 */
function setup() {
  var s = sheet();
  var cfg = fetchJson(CONFIG_URL);
  Logger.log('Bookings sheet: %s', s.getParent().getUrl());
  Logger.log('Sending as: %s', Session.getEffectiveUser().getEmail());
  Logger.log('Config loaded for: %s (%s min meetings)',
    cfg.organizer_name, cfg.meeting_minutes);
  Logger.log('Slots currently published: %s', fetchJson(AVAIL_URL).slots.length);
}
