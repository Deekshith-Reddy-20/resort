# Deployment test report

Invariant: V-Farms is one property-wide booking inventory for stays and events.

Date: 13 October 2026.

## Commands (this session)

| Command | Status | Notes |
|---|---|---|
| `npm test` | PASS | 54 web + 12 inventory; 4 live Supabase tests skipped (`VFARMS_LIVE_SUPABASE` unset) |
| `npm run typecheck` | PASS | |
| `npm run lint -w @vfarms/web` | PASS | |
| `npm run build -w @vfarms/web` | PASS | Next.js 15.5.27, 55 routes |
| `npm run verify:smoke` after `428d134` | PASS | Config 200, persistencyReady true |
| Live Razorpay | NOT RUN | Keys absent on Vercel |
| `VFARMS_LIVE_SUPABASE` integration tests | NOT RUN | Flag unset |
| E2E Playwright | NOT RUN | |
| Physical devices | NOT RUN | Viewport emulation only if later |

## Live smoke already executed (read-only)

| URL | Result | Status |
|---|---|---|
| `GET /` | HTTP 200 | PASS (HTML; inventory error still in API) |
| `GET /stays` | HTTP 200 | PASS |
| `GET /api/public/config` (after SQL + `428d134`) | 200 `persistencyReady: true` `maxGuests: null` `bookingEnabled: false` | PASS |
| `POST /api/availability/search` | 503 `missing_table` (does not claim available) | FAIL (persistence) / PASS (no false availability) |
| `GET /api/admin/session` | `configured: true` `method: supabase` `authenticated: false` | PASS |
| Checkout publish | `bookingEnabled: false` | PASS (correctly unpublished) |

## Safety

- No production bookings or payments created.
- No database reset.
- No secrets printed.
