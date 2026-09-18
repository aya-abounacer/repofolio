-- Run once against the same DATABASE_URL used by api/session.ts.
CREATE TABLE IF NOT EXISTS shared_portfolios (
  id uuid PRIMARY KEY,
  session_id text NOT NULL,
  content_hash text NOT NULL,
  portfolio jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, content_hash)
);
CREATE INDEX IF NOT EXISTS shared_portfolios_session_created
  ON shared_portfolios (session_id, created_at);
