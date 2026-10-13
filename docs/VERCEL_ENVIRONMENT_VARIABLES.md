# Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. After any change, **redeploy with a new build**. `NEXT_PUBLIC_*` values are baked in at build time. Do not use “Redeploy with existing build.”

Never paste real secrets into git, this file, or chat logs.

## What was wrong on `resort`

The Vercel Supabase integration created keys named `v_farm_resort_*` and `NEXT_PUBLIC_v_farm_resort_*`. The app reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

The running site therefore reported missing persistence and missing staff auth even though a Supabase project was already linked.

The application now also accepts the integration aliases. You should still copy the values onto the canonical names below so the names match `.env.example`.

`STAFF_SESSION_SECRET`, `DATABASE_MODE=supabase`, `PROPERTY_ID`, and `NEXT_PUBLIC_SITE_URL` were added on Production and Preview. Development passwords were not added.

## How to copy integration keys (dashboard)

1. Open [Vercel → resort → Environment Variables](https://vercel.com/deekshith10/resort/settings/environment-variables).
2. Find `NEXT_PUBLIC_v_farm_resort_SUPABASE_URL`. Reveal it. Add a **new** variable `NEXT_PUBLIC_SUPABASE_URL` with the same value for Production and Preview.
3. Copy `NEXT_PUBLIC_v_farm_resort_SUPABASE_ANON_KEY` (or `v_farm_resort_SUPABASE_ANON_KEY`) to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy `v_farm_resort_SUPABASE_SERVICE_ROLE_KEY` to `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `NEXT_PUBLIC_`).
5. Confirm `DATABASE_MODE` is `supabase` (not `memory`).
6. Confirm `STAFF_SESSION_SECRET` exists (long random HMAC key). If you rotate it, every staff session is signed out.
7. Deployments → ⋮ on the latest git commit → **Redeploy** (do not reuse the old build).

Use **Preview** and **Production**. Do not copy local `STAFF_DEV_*` onto Production.

## Required for hosted `/admin` (Supabase Auth)

| Name | Required | Public? | Environments | Purpose | Used in | How to validate |
|---|---|---|---|---|---|---|
| `STAFF_SESSION_SECRET` | Yes | Server | Preview + Production | HMAC for `vfarms_staff` cookie | `apps/web/src/lib/staff.ts` | `/api/admin/session` GET returns `configured: true`, `method: "supabase"`. Generate with `openssl rand -hex 32` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | Preview + Production | Supabase project URL | `supabase-admin.ts` | Sign-in form no longer says auth is unconfigured |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public | Preview + Production | Auth `signInWithPassword` | `supabase-admin.ts` | Invalid password → 401, not 503 |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server | Preview + Production | Read `admin_profiles`; persist `runtime_state` | `staff.ts`, `persist.ts` | Authorized staff 200; unknown Auth user 403 |

## Persistence

| Name | Required | Public? | Environments | Purpose | Used in | How to validate |
|---|---|---|---|---|---|---|
| `DATABASE_MODE` | Yes on Vercel for durable data | Server | Preview + Production | `supabase` enables `runtime_state`. `memory` disables it | `supabase-admin.ts` | Admin Overview persistency string contains `runtime_state`, not `memory` |
| `PROPERTY_ID` | Optional (`vfarms-hyderabad`) | Server | Both | Snapshot key | `store.ts`, `persist.ts` | Must match a single estate |

On Vercel, if `DATABASE_MODE` is unset and URL + service role exist, persistence turns on automatically. Set `DATABASE_MODE=memory` only to force a non-durable rollback.

## Do not set on Vercel

| Name | Why |
|---|---|
| `STAFF_DEV_EMAIL` | Production must use Supabase Auth |
| `STAFF_DEV_PASSWORD` | Same |
| `STAFF_ALLOW_DEV_PASSWORD` | Local-only switch |
| `DEV_STAY_CONFIG_PUBLISH` and other `DEV_*` commercial fields | Would publish unpublished owner rates |
| Any `NEXT_PUBLIC_` service-role or Razorpay secret | Leaks in the browser bundle |

## Public site

| Name | Required | Public? | Environments | Purpose | Used in | How to validate |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public | Production (and Preview if you want a fixed origin) | Canonical URLs | `site.ts` | Open Graph URLs are `https://…`, not localhost |

## Payments (required before charging guests; optional until then)

| Name | Required | Public? | Environments | Purpose | Used in | How to validate |
|---|---|---|---|---|---|---|
| `RAZORPAY_KEY_ID` | For checkout | Server (id is also returned to Checkout) | Preview test keys; Production live only when going live | Order create | `payments.ts`, orders route | Missing → 503 `PAYMENTS_NOT_CONFIGURED` |
| `RAZORPAY_KEY_SECRET` | For checkout | Server | Same | Order + checkout HMAC | `payments.ts`, verify route | Invalid signature → 400 |
| `RAZORPAY_WEBHOOK_SECRET` | For webhooks | Server | Same | Webhook HMAC | webhooks/razorpay | Invalid signature → 400 |
| `RAZORPAY_LIVE_MODE` | Set `false` until go-live | Server | Preview `false` | Flag only | `store.ts` | Admin integrations `razorpayLive` |

Webhook URL: `https://<host>/api/payments/webhooks/razorpay`  
Events: `payment.captured`, `payment.failed`. A Checkout success screen is not confirmation.

## Email (optional)

| Name | Required | Public? | Purpose |
|---|---|---|---|
| `RESEND_API_KEY` | No | Server | Transactional email |
| `EMAIL_FROM` | No | Server | Verified sender |
| `NOTIFY_OWNER_EMAIL` | No | Server | Enquiry copy |

## Other optional

| Name | Default | Purpose |
|---|---|---|
| `PROPERTY_TIMEZONE` | unused | App timezone is hardcoded `Asia/Kolkata` |
| `HOLD_MINUTES` | `15` | Hold length if unpublished snapshot has no value |
| `RATE_LIMIT_MAX` | `60` | API throttle |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Throttle window |
| `BOOKING_ENABLED` | unused by live commercial | Publication is the admin Pricing publish action, not this flag |

## Automatic (Vercel-provided)

`VERCEL`, `VERCEL_ENV`, `VERCEL_URL`. Do not treat `VERCEL_URL` as a payment trust source from the browser.

## After configuration

Redeploy. Confirm the deployment uses the git commit that contains this documentation. Then:

1. `GET /api/admin/session` → `configured: true`, `method: "supabase"`.
2. Sign in with the Auth user that has `admin_profiles`.
3. Overview persistency is `supabase runtime_state`.
4. Keep stay checkout unpublished until Razorpay test capture + webhook are verified.
