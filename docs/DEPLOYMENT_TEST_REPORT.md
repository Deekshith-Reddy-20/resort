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
| `npm run verify:smoke` | FAIL expected until `runtime_state` exists | Hits `https://resort-delta-nine.vercel.app` |
| Live Razorpay | NOT RUN | Keys absent on Vercel |
| `VFARMS_LIVE_SUPABASE` integration tests | NOT RUN | Flag unset |
| E2E Playwright | NOT RUN | |
| Physical devices | NOT RUN | Viewport emulation only if later |

## Live smoke already executed (read-only)

| URL | Result | Status |
|---|---|---|
| `GET /` | HTTP 200 | PASS (HTML; inventory error still in API) |
| `GET /stays` | HTTP 200 | PASS |
| `GET /api/public/config` | 503 `PGRST205` `missing_table` `maxGuests: null` `bookingEnabled: false` | FAIL |
| `POST /api/availability/search` | 503 `missing_table` (does not claim available) | FAIL (persistence) / PASS (no false availability) |
| `GET /api/admin/session` | `configured: true` `method: supabase` `authenticated: false` | PASS |
| Checkout publish | `bookingEnabled: false` | PASS (correctly unpublished) |

## Safety

- No production bookings or payments created.
- No database reset.
- No secrets printed.
