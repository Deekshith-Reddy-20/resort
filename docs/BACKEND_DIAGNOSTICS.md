# V-Farms backend diagnostics

This document records the actual causes of the production symptoms on `https://resort-delta-nine.vercel.app` and what the repository now does. It does **not** claim that Vercel or Supabase were live-verified after these code changes.

## 1. Staff authentication error

**Symptom:** `/admin` showed *Staff authentication is not configured. Set STAFF_SESSION_SECRET and STAFF_DEV_EMAIL…*

**Cause:** `apps/web/src/lib/staff.ts` signs an HTTP-only HMAC cookie with `STAFF_SESSION_SECRET`. Production previously also required `STAFF_DEV_EMAIL` / `STAFF_DEV_PASSWORD`. Those variables were not (and must not be) the production login path. With the secret missing on Vercel, `staffConfigured()` was false and the sign-in form reported unconfigured auth.

**Intended production path (now wired):**

1. `STAFF_SESSION_SECRET` on the Vercel server (HMAC cookie, 12 hours, `httpOnly`, `SameSite=Lax`, `Secure` on Vercel).
2. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` for `signInWithPassword`.
3. `SUPABASE_SERVICE_ROLE_KEY` (server-only) to read `admin_profiles` after Auth succeeds.
4. A row in `admin_profiles` whose `id` equals the Auth user UUID. Guests cannot insert that row (RLS has no public insert policy).

`STAFF_DEV_*` works only when **all** of these are true: not on Vercel, `NODE_ENV` is not `production`, `STAFF_ALLOW_DEV_PASSWORD=true`, and the secret plus local email/password are set.

Logout: `DELETE /api/admin/session` clears the cookie. Admin APIs already return 401 without a valid cookie.

## 2. “Online stay booking is not published”

**Cause:** This is an owner publication control, not a missing API. `bookingBlockers()` in `apps/web/src/lib/store.ts` returns that message when `settings.live` is false or the published commercial snapshot is incomplete (`liveCommercial()` is null). `StayFlow` copies `quote.blockMessage` onto the submit button.

Checkout stays disabled until an authorized staff member saves a **complete** Pricing draft and publishes it (`POST /api/admin/settings` with `action: "publish"`). `DEV_STAY_CONFIG_PUBLISH` must never be set on Vercel.

If the host is Vercel and persistence is not configured, a separate first blocker explains missing Supabase keys / `runtime_state`.

## 3. Request paths

| Flow | Path |
|---|---|
| Load `/admin` | Client `GET /api/admin/session` then login form or dashboard |
| Staff sign-in | `POST /api/admin/session` → `authenticateStaff` → HMAC cookie |
| Dashboard | `GET /api/admin/overview` (requires cookie) |
| Availability | `POST /api/availability/search` → `canAllocate` on whole-property inventory |
| Stay quote | `POST /api/pricing/quote` → published rates only |
| Hold | `POST /api/bookings/holds` → mutex + overlap check |
| Payment order | `POST /api/payments/orders` → Razorpay if keys exist |
| Verify | `POST /api/payments/verify` HMAC of `orderId\|paymentId` |
| Webhook | `POST /api/payments/webhooks/razorpay` HMAC + idempotent `eventId` |
| Persist | `runtime_state` JSON snapshot via service role when `usingSupabaseStore()` |

## 4. Persistence

Runtime APIs still use the in-process inventory store. On Vercel that store is not durable unless `runtime_state` is used.

`usingSupabaseStore()` is true when:

- `DATABASE_MODE=supabase` and URL + service role are set, or
- `VERCEL` is set, `DATABASE_MODE` is not `memory`, and URL + service role are set.

`DATABASE_MODE=memory` forces memory even on Vercel (for emergency rollback only).

This snapshot is **not** the same as writing every row into `stay_bookings` / `inventory_blocks`. Those tables and `vfarms_inventory_guard` remain the long-term schema. The snapshot is what serverless instances can actually share today.

A live database connection was **not** tested from this workspace.

## 5. Remaining production blockers

- Vercel env vars must be set and the project redeployed from the latest git commit.
- Supabase migrations must be applied, including `20261013123000_runtime_state.sql`.
- First staff user must be created in Auth + `admin_profiles` (see `docs/SUPABASE_SETUP.md`).
- Razorpay test keys + webhook secret are required before real checkout.
- Stay commercials remain unpublished until the owner publishes them.
- Online booking is **not** ready to enable until persistency, published rates, and payment verification are confirmed on the deployed host.
