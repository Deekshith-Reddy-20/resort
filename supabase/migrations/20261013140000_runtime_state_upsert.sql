-- Transaction-scoped advisory lock so concurrent Vercel instances cannot
-- last-write-wins overwrite each other when updating the inventory snapshot.
-- Safe to re-run. Requires public.runtime_state from 20261013123000_runtime_state.sql.

CREATE OR REPLACE FUNCTION public.upsert_runtime_state(p_slug text, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('runtime_state:' || p_slug));
  INSERT INTO runtime_state (property_slug, payload, updated_at)
  VALUES (p_slug, p_payload, now())
  ON CONFLICT (property_slug)
  DO UPDATE SET payload = EXCLUDED.payload, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_runtime_state(text, jsonb) FROM PUBLIC;
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.upsert_runtime_state(text, jsonb) TO service_role;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END
$$;
