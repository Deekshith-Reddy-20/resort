# Supabase setup for V-Farms

Do not put the service-role key in any `NEXT_PUBLIC_*` variable.

A Supabase project is already linked to Vercel as integration variables prefixed `v_farm_resort_`. Those are real credentials. The Next.js app now reads both the canonical names and those aliases.

This workspace **could not apply SQL**. `vercel env pull` redacts secret values to `[SENSITIVE]`, so no live Postgres URL was available here. Apply migrations yourself in the Supabase SQL editor.

## Project keys

From Supabase → Project Settings → API (or by copying the Vercel integration values onto these names):

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon/publishable key only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (Vercel + `.env.local`) | Bypasses RLS. Never ship to the browser or Android app |

Auth: enable Email provider. Add the Vercel origin under Authentication → URL configuration (redirect allow list), for example `https://resort-delta-nine.vercel.app/admin`.

## Apply migrations

Paste each file into the Supabase SQL editor **in this order**. Do not run `RESET`, `DROP DATABASE`, or delete `public` data.

1. `supabase/migrations/20261012120000_vfarms_core.sql`  
   Creates types (`staff_role` includes `owner`, `admin`, `reservations`, `operations`, `content`), `properties` (`room_count = 5`, `booking_enabled` default false, `rates_published` default false), `inventory_blocks` plus `vfarms_inventory_guard` overlap trigger, `stay_bookings`, `event_enquiries`, `admin_profiles(id, role, display_name)`, payments, RLS. Safe on a **new** schema; will error if types/tables already exist — skip this file if `properties` already exists.
2. `supabase/migrations/20261012163000_stay_commercial_draft.sql`  
   Adds `draft_settings` / `published_settings` / `stay_config_live` on `properties` (`IF NOT EXISTS`). Safe to re-run.
3. `supabase/migrations/20261012193000_room_photographs.sql`  
   Updates room image paths only. Does not drop rows. Safe to re-run.
4. `supabase/migrations/20261013123000_runtime_state.sql`  
   `runtime_state(property_slug PK, payload jsonb, updated_at)`. RLS on, **no public policies**. `CREATE TABLE IF NOT EXISTS` — safe to re-run.

**Live production (verified in Vercel logs):** `GET /api/public/config` and `POST /api/pricing/quote` fail with PostgREST `PGRST205` (`runtime_state` not in the schema cache). That is a missing table, not bad capacity data. Applying this file in the linked Supabase SQL editor is the required repair. Do not reset the database.

Then run `supabase/verify_required_tables.sql` (read-only). You should see `admin_profiles`, `inventory_blocks`, `properties`, `runtime_state`, and related booking tables.

This workspace did not apply them for you.

`runtime_state` has RLS enabled and **no public policies**. Guests using the anon key cannot read or write it. The Next.js server uses the service role.

## First authorized staff account

Users cannot grant themselves admin. `admin_profiles` has only `SELECT` for `auth.uid() = id`.

1. In Authentication → Users, create the owner email (set a strong password yourself; do not reuse local `STAFF_DEV_PASSWORD`).
2. Copy the user UUID.
3. In SQL editor:

```sql
INSERT INTO admin_profiles (id, role, display_name)
VALUES ('<auth-user-uuid>', 'owner', 'Owner');
```

Allowed roles: `owner`, `admin`, `reservations`, `operations`, `content`.

4. Sign in at `/admin` with that email and password after Vercel has `STAFF_SESSION_SECRET` and the three Supabase variables.

If login returns 403, Auth succeeded but `admin_profiles` has no matching row. If 503, the session secret, anon keys, or service role is missing.

## Access rules (schema)

- Public `SELECT` only on published property/rooms/media/content/faqs/policies.
- No anon policies on customers, stays, payments, refunds, webhooks, audit, or `runtime_state`.
- Staff role for privileged APIs comes from `admin_profiles`, not from the JWT `app_metadata` the browser could invent.

## Local development

Keep `DATABASE_MODE=memory` unless you have applied migrations and set `DATABASE_MODE=supabase`. Local password login uses `STAFF_ALLOW_DEV_PASSWORD=true` (never on Vercel).
