-- One row per booked meeting. `slot` is the primary key, which is what makes
-- double-booking impossible: the second INSERT for the same instant fails.
CREATE TABLE IF NOT EXISTS bookings (
  slot       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  topic      TEXT,
  uid        TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bookings_email_idx ON bookings (email, created_at);
