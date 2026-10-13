# Production environment audit

Date: 13 October 2026. Secrets are never listed here.

## Linked stack (verified)

| Item | Value | Status |
|---|---|---|
| GitHub | `Deekshith-Reddy-20/resort`, branch `main` | PASS |
| Vercel project | `deekshith10/resort` | PASS |
| Production alias | `https://resort-delta-nine.vercel.app` | PASS |
| Latest Ready deployment (CLI) | `dpl_4bpFxHJFxcdkcZnDqd3X2L1j9mBo` / `resort-d0jvz4awt-deekshith10.vercel.app`, created 13 Oct 2026 13:49 IST | PASS (Ready ≠ working backend) |
| Git SHA on that deployment | Not returned by `vercel inspect --json` in this session | BLOCKED |
| Intended commit at audit start | `b90699b` on `origin/main` | PASS (local = origin) |
| Node | `24.x` in package engines | PASS |
| App root on Vercel | `apps/web` (`vercel.json` install/build from monorepo root) | PASS |
| Supabase | Vercel integration prefix `v_farm_resort_*` | PASS (names present; values Hidden) |

## Variables the application actually reads

Canonical names, with Vercel integration aliases where implemented in `apps/web/src/lib/supabase-admin.ts`.

| Name | Purpose | Required | Public? | Vercel env | Consumed | Safe check (no values) |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_v_farm_resort_SUPABASE_URL` / `v_farm_resort_SUPABASE_URL` | Project URL | Yes (hosted) | URL is public | Production + Preview | `supabase-admin.ts` | `/api/public/config` persistency, not 401 JWT |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `v_farm_resort_*` anon/publishable aliases | Supabase Auth | Yes (staff) | Public | Both | `staff.ts` | `/api/admin/session` `method: supabase` |
| `SUPABASE_SERVICE_ROLE_KEY` or `v_farm_resort_SUPABASE_SERVICE_ROLE_KEY` / `v_farm_resort_SUPABASE_SECRET_KEY` | `admin_profiles` + `runtime_state` | Yes (hosted) | **Server only** | Both | `persist.ts`, `staff.ts` | Never `NEXT_PUBLIC_`. Live config reaches PostgREST |
| `DATABASE_MODE` | `supabase` or `memory` | Yes on Vercel (`supabase`) | Server | Both | `supabase-admin.ts` | Must not be `memory` on the booking host |
| `STAFF_SESSION_SECRET` | HMAC cookie | Yes (hosted) | Server | Both | `staff.ts` | Session GET `configured: true` |
| `PROPERTY_ID` | `runtime_state` PK | Optional (default `vfarms-hyderabad`) | Server | Both | `persist.ts`, `store.ts` | Length only |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin | Recommended | Public | Production | `site.ts` | Sitemap/OG hosts |
| `HOLD_MINUTES` | Default hold if draft empty | Optional | Server | Optional | `commercial.ts` | — |
| `RAZORPAY_KEY_ID` | Checkout | Before charging | Server (id sent to client for Checkout) | Preview test; Production only when going live | `payments.ts`, `public/config` | Config `paymentsConfigured` |
| `RAZORPAY_KEY_SECRET` | Orders + checkout HMAC | Before charging | Server | Same | `payments.ts` | Invalid signature → 400 |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC | Before charging | Server | Same | webhooks route | 503 if webhook called without it |
| `RAZORPAY_LIVE_MODE` | Live flag | Optional | Server | Preview `false` | `store.ts` | — |
| `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFY_OWNER_EMAIL` | Email | Optional | Server | Optional | `notify.ts` | Contact `delivered: false` until verified |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | Per-instance throttle | Optional | Server | Optional | `rate-limit.ts` | Not global on serverless |

## Names in `.env.example` that the app does not read

| Name | Status |
|---|---|
| `BOOKING_ENABLED` | Unused. Publication is admin Pricing **publish**. |
| `PROPERTY_TIMEZONE` | Unused. Code uses `Asia/Kolkata`. |

## Must never be set on Vercel

`STAFF_DEV_EMAIL`, `STAFF_DEV_PASSWORD`, `STAFF_ALLOW_DEV_PASSWORD`, `DEV_STAY_CONFIG_PUBLISH` and other `DEV_*` rate fields. Dev password login is disabled when `VERCEL` is set or `NODE_ENV=production`.

## Observed Production names (`vercel env ls`, values Hidden)

Present: `PROPERTY_ID`, `DATABASE_MODE`, `STAFF_SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, and the full `v_farm_resort_*` / `NEXT_PUBLIC_v_farm_resort_*` Supabase + Postgres set.

Canonical `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` were **not** listed as separate names. Aliases in code cover this.

Razorpay names were **not** listed. Payments remain unconfigured.

`vercel env run` in this agent **cannot pull** the 17 production secrets (`present=false` for all keys). Do not paste secrets into chat.

## Owner dashboard steps (no values in chat)

1. Vercel → `resort` → Settings → Environment Variables.
2. Keep `DATABASE_MODE=supabase`. Do not set `memory`.
3. Optional hygiene: copy integration aliases onto canonical `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` (server-only).
4. Leave Razorpay empty until test-mode lifecycle is verified.
5. After env changes: Redeploy **with a new build**.
