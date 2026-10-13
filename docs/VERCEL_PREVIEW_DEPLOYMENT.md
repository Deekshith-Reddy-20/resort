# Vercel preview deployment

Official import: [https://vercel.com/new](https://vercel.com/new)  
Existing empty project: [https://vercel.com/deekshith10/resort](https://vercel.com/deekshith10/resort)

**As of this document, that Vercel project has no Production Deployment and Git is not connected.** A public HTTPS URL does not exist until you import the GitHub repository and a build succeeds. This file does not invent a hostname.

GitHub remote already in use: `https://github.com/Deekshith-Reddy-20/resort.git` (`main`).

## Architecture (source of truth)

| Piece | Location |
|---|---|
| Next.js 15 App Router | `apps/web` |
| Inventory rules | `packages/inventory` (workspace `@vfarms/inventory`) |
| Public site + `/admin` | Same Next app, same-origin `/api/*` |
| Persistence | In-process memory (`store.ts`). **Not** shared across Vercel serverless instances |
| Staff auth | HMAC cookie (`STAFF_SESSION_SECRET`). Supabase Auth is not wired |
| Payments | Server Razorpay orders + signature verify + webhook; disabled without keys |
| Android | Out of this preview. Emulator uses `10.0.2.2:3000` |

Whole-estate booking only. Five rooms are informational.

## Blockers you must accept for Preview

1. **Memory store on serverless.** Holds, enquiries, admin calendar, and CMS drafts will not survive across function instances. Public marketing pages still render. Do not demonstrate live paid bookings as durable until `DATABASE_MODE=supabase` is implemented against a migrated project.
2. **Unpublished stay rates.** Instant stay checkout stays off until an owner publishes a complete commercial snapshot in admin (and that snapshot is lost on each cold instance in memory mode).
3. **No iPad/iOS app.** Clients open the **HTTPS website** in Safari/Chrome. Native iPad is not in the repo.
4. **`preview.mp4` is ~84 MB.** GitHub already warned. Vercel static file limit is 100 MB; upload may be slow. If a deploy fails on size, keep the poster image and serve the film from object storage later.
5. **Secrets.** Preview admin needs `STAFF_SESSION_SECRET` + unique `STAFF_DEV_*`. Razorpay test keys optional.

## Vercel project settings (verify in the dashboard)

Connect Git: `Deekshith-Reddy-20/resort`, branch `main`.

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| **Root Directory** | `apps/web` |
| Include files outside Root Directory | On (workspace package `packages/inventory`) |
| Install Command | `cd ../.. && npm ci` (also in `apps/web/vercel.json`) |
| Build Command | `cd ../.. && npm run build -w @vfarms/web` |
| Output | Next.js default (do **not** set static export) |
| Node.js | `20.x` (`.nvmrc` and `engines`) |
| Skip Deployments | Off for `main` until you want them |

Do not set an Output Directory manually. Do not enable `next export`.

## Environment variables

See `docs/VERCEL_ENVIRONMENT_VARIABLES.md`. Minimum Preview set:

- `STAFF_SESSION_SECRET`
- `STAFF_DEV_EMAIL`
- `STAFF_DEV_PASSWORD` (preview-only)
- `RAZORPAY_LIVE_MODE=false`
- `DATABASE_MODE=memory` (honest default)

After the first green deploy, copy the `*.vercel.app` URL into `NEXT_PUBLIC_SITE_URL` (https, no trailing slash) and redeploy.

## Manual steps (your accounts)

1. Confirm `main` on GitHub includes these config files (`vercel.json`, `next.config.ts` tracing root, docs).
2. Open [https://vercel.com/deekshith10/resort](https://vercel.com/deekshith10/resort) → **Settings → Git** → connect `Deekshith-Reddy-20/resort`. If the UI asks you to import instead, use [https://vercel.com/new](https://vercel.com/new) and select that repo, then set Root Directory `apps/web`.
3. Add environment variables (Preview).
4. **Deployments → Deploy** (or push a commit to `main`).
5. Open the generated `https://….vercel.app` URL.
6. Enable **Deployment Protection** (Vercel Authentication) for Preview so the URL is not a public admin target. Share the protection password or Vercel login with the client if you enable it.
7. Razorpay: keep empty for a content-only preview, or add **test** keys and webhook `https://<host>/api/payments/webhooks/razorpay`.
8. Supabase: optional for this preview. Apply SQL later on a non-prod project; Auth redirect `https://<host>/admin`.

## Client share checklist

- Public pages: `/` `/estate` `/rooms` `/stays` `/events` `/gallery` `/experiences` `/about` `/faq` `/contact` `/legal`
- Rooms have no individual Book CTA
- `/admin` requires staff credentials; no default production password is shipped
- Tell the client Preview inventory resets (memory) and rates may be unpublished
- Desktop, iPad, and phones use the same HTTPS site (responsive CSS). This is not a native iPad app

## Security

- Admin and `/api/admin/*` require the staff cookie
- API JSON is `Cache-Control: private, no-store`
- Preview `robots.txt` disallows all crawlers
- Do not treat an unguessable `vercel.app` URL as secret
- Never confirm a stay from the Checkout UI alone
