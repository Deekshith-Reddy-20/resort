# Deployment test report

Invariant: V-Farms is one property-wide booking inventory for stays and events.

Date: 13 October 2026 (local). Environment: developer workstation, then Vercel project [resort](https://vercel.com/deekshith10/resort) inspected via the public dashboard snapshot (no production deployment, Git not connected).

## 1. Initial repository findings

- Monorepo npm workspaces: `@vfarms/web` (`apps/web`), `@vfarms/inventory`.
- Git: `main` tracking `https://github.com/Deekshith-Reddy-20/resort.git`.
- Next.js 15 App Router, Tailwind, Razorpay server routes, staff HMAC cookie.
- `DATABASE_MODE=memory` is the only implemented persistence.
- Supabase SQL migrations exist; no runtime adapter.
- Vercel project `deekshith10/resort` existed with **0/5** production checklist and **no production deployment**.
- Hardcoded `localhost:3000` in metadata/sitemap/robots (fixed to `publicSiteUrl()`).
- No GitHub Actions workflows.

## 2. Deployment-blocking issues

| Issue | Status |
|---|---|
| Next.js app not at repo root | Mitigated: `apps/web/vercel.json` + documented Root Directory `apps/web` |
| Workspace package tracing | Mitigated: `outputFileTracingRoot` to repo root |
| Canonical URLs on preview | Mitigated: `VERCEL_URL` / `NEXT_PUBLIC_SITE_URL` |
| Admin JSON cached | Mitigated: `private, no-store` |
| Serverless memory store | **Unresolved** — requires Supabase adapter (owner project) |
| Unpublished rates | **Owner** — do not invent |
| Vercel Git not connected | **Your action** |
| Preview URL | **Not created** — do not invent |

## 3. Files changed in this pass

- `apps/web/src/lib/site.ts`, `http.ts`, `layout.tsx`, `sitemap.ts`, `robots.ts`, `next.config.ts`, `vercel.json`
- `apps/web/src/app/api/admin/session/route.ts`, `AdminDashboard.tsx`
- `.nvmrc`, root/`apps/web` `package.json` engines `24.x`
- `.env.example`
- `apps/web/tests/site.test.ts`
- This file plus `VERCEL_PREVIEW_DEPLOYMENT.md`, `VERCEL_ENVIRONMENT_VARIABLES.md`

`.env.local` remains gitignored. No secrets committed.

## 4. Commands executed

See the results table filled after the local run in this session.

| Command | Result |
|---|---|
| `npm run typecheck` | PASS (13 Oct 2026) |
| `npm run lint -w @vfarms/web` | PASS (0 warnings). Fixed `@next/next/no-html-link-for-pages` on EventsForm |
| `npm run test` | PASS 36 web + 12 inventory |
| `npm run build` | PASS Next.js 15.5.27, 55 routes compiled |
| Vercel CLI deploy | **NOT TESTED** — requires your Vercel login |
| Live HTTPS smoke | **NOT TESTED** — [resort on Vercel](https://vercel.com/deekshith10/resort) has no production deployment |

## 5. Booking / payment safety (code, not live)

Covered by existing unit tests (holds, enquiry-not-a-hold, signature reject, paid-unbooked, snapshot immutability). Live Razorpay Checkout on preview: **NOT TESTED**.

## 6. Device testing

Viewport CSS exists (mobile dock, admin stacked nav). Physical iPad/iPhone: **NOT TESTED**. Browser viewport emulation: **NOT TESTED this pass**.

## 7. Milestones

| Milestone | State |
|---|---|
| Code prepared | Yes (this pass) |
| Build passed | Yes (local `npm run build`) |
| GitHub push | Separate from Vercel; only if a new commit is pushed |
| Vercel deployment | **Not completed** |
| Preview verified | **No** |
| Production ready | **No** |

## 8. Your next action

1. Push the deployment-config commit if it is not on `origin/main`.
2. In [https://vercel.com/deekshith10/resort](https://vercel.com/deekshith10/resort) connect GitHub `Deekshith-Reddy-20/resort`, Root Directory `apps/web`.
3. Add Preview env vars from `VERCEL_ENVIRONMENT_VARIABLES.md`.
4. Deploy and send the real `https://….vercel.app` URL only after the build log is green.

Do not tell the client that Vercel hosting is live until that URL opens without your laptop running.
