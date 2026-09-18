-- Run in the same Neon database as sessions and shared_portfolios.
-- Reservations also count failed uploads, to limit repeated upload attempts.
CREATE TABLE IF NOT EXISTS profile_photo_uploads (
  id uuid PRIMARY KEY,
  session_id text NOT NULL,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_photo_uploads_session_created
  ON profile_photo_uploads (session_id, created_at);
