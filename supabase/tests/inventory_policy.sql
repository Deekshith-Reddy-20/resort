-- Run against a migrated database:
-- psql "$DATABASE_URL" -f supabase/tests/inventory_policy.sql
-- NOT TESTED until a Supabase/Postgres instance is provisioned.

BEGIN;

DO $$
DECLARE
  pid uuid;
  a uuid;
  b uuid;
BEGIN
  SELECT id INTO pid FROM properties WHERE slug = 'vfarms-hyderabad';

  INSERT INTO inventory_blocks (property_id, kind, status, start_date, end_date, end_exclusive)
  VALUES (pid, 'stay', 'active', '2026-11-06', '2026-11-07', true)
  RETURNING id INTO a;

  -- Back-to-back stay must succeed (G05)
  INSERT INTO inventory_blocks (property_id, kind, status, start_date, end_date, end_exclusive)
  VALUES (pid, 'stay', 'active', '2026-11-07', '2026-11-08', true)
  RETURNING id INTO b;

  -- Overlapping stay must fail (G04)
  BEGIN
    INSERT INTO inventory_blocks (property_id, kind, status, start_date, end_date, end_exclusive)
    VALUES (pid, 'stay', 'active', '2026-11-06', '2026-11-08', true);
    RAISE EXCEPTION 'expected stay overlap to fail';
  EXCEPTION WHEN exclusion_violation THEN
    NULL;
  END;

  -- Event on departure date must fail (G06)
  BEGIN
    INSERT INTO inventory_blocks (property_id, kind, status, start_date, end_date, end_exclusive)
    VALUES (pid, 'event', 'active', '2026-11-07', '2026-11-07', false);
    RAISE EXCEPTION 'expected event on departure to fail';
  EXCEPTION WHEN exclusion_violation THEN
    NULL;
  END;
END $$;

ROLLBACK;
