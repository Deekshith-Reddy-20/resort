-- Server-side inventory snapshot for Vercel serverless persistence.
-- Service role only. Guests never read this table through the anon key.

CREATE TABLE IF NOT EXISTS runtime_state (
  property_slug text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE runtime_state ENABLE ROW LEVEL SECURITY;
