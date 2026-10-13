# Vercel environment variables

V-Farms is one exclusive whole-property inventory for stays and events. Rooms are not sellable SKUs.

Copy names from `.env.example`. Never paste real secrets into git, tickets, or client emails.

Set these in [Vercel → resort → Settings → Environment Variables](https://vercel.com/deekshith10/resort/settings/environment-variables) for **Preview** (and Production later). After the first successful deploy, also set `NEXT_PUBLIC_SITE_URL` to the HTTPS hostname Vercel assigned.

## Required for a usable preview

| Name | Public? | Mandatory | Purpose | How to validate |
|---|---|---|---|---|
| `STAFF_SESSION_SECRET` | Server only | Yes, for `/admin` | HMAC for the staff cookie | `/admin` returns a sign-in form, not 503; invalid login is 401 |
| `STAFF_DEV_EMAIL` | Server only | Yes until Supabase Auth is wired | Preview owner login | Sign-in with this email |
| `STAFF_DEV_PASSWORD` | Server only | Yes until Supabase Auth | Preview owner login | Use a unique password; not the local one |

Generate the session secret locally (`openssl rand -hex 32`) and paste only into Vercel. Do not reuse a password you already shared.

## Public (safe in the browser bundle)

| Name | Mandatory | Purpose | How to validate |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Recommended after first deploy | Canonical origin for metadata, sitemap, robots | View page source: Open Graph URLs are `https://…`, not `localhost` |
| `NEXT_PUBLIC_SUPABASE_URL` | No (APIs use memory until the adapter is wired) | Future browser Supabase client | Presence only; does not persist bookings today |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Future anon key | Must never be a service-role key |

## Server-only (never `NEXT_PUBLIC_*`)

| Name | Mandatory for preview | Purpose |
|---|---|---|
| `DATABASE_MODE` | Default `memory` | `memory` = in-process store (does **not** persist on Vercel serverless). `supabase` is **not implemented** in application code yet |
| `SUPABASE_SERVICE_ROLE_KEY` | No until adapter exists | Must stay server-only; unused by runtime APIs today |
| `PROPERTY_ID` | Optional (`vfarms-hyderabad`) | Single sellable property id |
| `PROPERTY_TIMEZONE` | Optional (`Asia/Kolkata`) | Documented timezone |
| `HOLD_MINUTES` | Optional (`15`) | Default hold if unpublished commercial snapshot has no value |
| `RAZORPAY_KEY_ID` | No | Test key id; Checkout stays disabled if empty |
| `RAZORPAY_KEY_SECRET` | No | Server-only order + signature verify |
| `RAZORPAY_WEBHOOK_SECRET` | No | Webhook HMAC |
| `RAZORPAY_LIVE_MODE` | Set `false` | Must stay false on preview |
| `RESEND_API_KEY` | No | Transactional email |
| `EMAIL_FROM` | No | Verified sender |
| `NOTIFY_OWNER_EMAIL` | No | Owner enquiry copy |
| `RATE_LIMIT_MAX` | Optional | API throttle |
| `RATE_LIMIT_WINDOW_MS` | Optional | API throttle window |

## Do not set on Vercel

| Name | Why |
|---|---|
| `DEV_STAY_CONFIG_PUBLISH` | Local-only rate bootstrap. Would publish unpublished owner rates |
| `DEV_WEEKDAY_INR` / other `DEV_*` commercial fields | Invented or local-only tariffs |
| Any `NEXT_PUBLIC_` Razorpay **secret** or service-role key | Would leak in the client bundle |

## Automatic (Vercel-provided)

`VERCEL`, `VERCEL_ENV`, `VERCEL_URL` are set by the platform. The app uses `VERCEL_URL` for canonical links when `NEXT_PUBLIC_SITE_URL` is empty. Do not treat `VERCEL_URL` as a payment trust source from the browser.

## Preview vs Production

Use **test** Razorpay keys on Preview. Do not put live merchant keys on a public preview URL. Enable [Deployment Protection](https://vercel.com/docs/deployment-protection) on Preview so `/admin` is not only guarded by a guessable password.

## Supabase (not runtime-ready)

Migrations live in `supabase/migrations/`. RLS and `vfarms_inventory_guard` are in SQL. Runtime APIs still use `DATABASE_MODE=memory`. A green frontend build does **not** mean Postgres is the inventory source of truth.

When the adapter is wired, Preview Auth redirect URLs will be `https://<preview-host>/admin` (and any future callback). Apply migrations on a dedicated non-production project first.

## Razorpay test webhook (after you have an HTTPS URL)

Dashboard webhook URL: `https://<your-preview-host>/api/payments/webhooks/razorpay`  
Events: `payment.captured`, `payment.failed`.  
Confirmation still requires HMAC verification. A Checkout “success” animation is not a booking.
