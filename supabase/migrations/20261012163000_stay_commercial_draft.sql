-- Draft vs published whole-property stay commercial configuration.
-- Live booking must read published_settings only.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS draft_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_settings jsonb,
  ADD COLUMN IF NOT EXISTS stay_config_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stay_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_summary text,
  ADD COLUMN IF NOT EXISTS terms_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_confirmed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS seasonal_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  nightly_minor bigint NOT NULL CHECK (nightly_minor > 0),
  published boolean NOT NULL DEFAULT false,
  CONSTRAINT seasonal_dates_ok CHECK (end_date >= start_date)
);

ALTER TABLE seasonal_rates ENABLE ROW LEVEL SECURITY;
