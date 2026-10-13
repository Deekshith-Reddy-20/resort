# Supabase setup for V-Farms

Do not put the service-role key in any `NEXT_PUBLIC_*` variable.

## Project keys

From Supabase → Project Settings → API:

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon/publishable key only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (Vercel + `.env.local`) | Bypasses RLS. Never ship to the browser or Android app |

Auth: enable Email provider. Add the Vercel origin under Authentication → URL configuration (redirect allow list), for example `https://resort-delta-nine.vercel.app/admin`.

## Apply migrations

In order, from `supabase/migrations/`:

1. `20261012120000_vfarms_core.sql` — property, inventory, bookings, `admin_profiles`, RLS, `vfarms_inventory_guard`
2. `20261012163000_stay_commercial_draft.sql`
3. `20261012193000_room_photographs.sql`
4. `20261013123000_runtime_state.sql` — serverless JSON snapshot (`runtime_state`)

Use the Supabase SQL editor or CLI (`supabase db push`) against **this** project. This workspace did not apply them for you.

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
