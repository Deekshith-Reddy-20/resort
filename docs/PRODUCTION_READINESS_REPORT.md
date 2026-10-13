# V-Farms production readiness report

Date: 13 October 2026. Do not treat Vercel **Ready** as a working booking backend.

## 1. Repository and deployment

| Check | Status | Evidence |
|---|---|---|
| Repo `main` = `origin/main` at audit start | PASS | `b90699b` |
| Vercel `deekshith10/resort` production Ready | PASS | `dpl_4bpFxHJFxcdkcZnDqd3X2L1j9mBo`, alias `resort-delta-nine.vercel.app` |
| Deployed git SHA equals `HEAD` | BLOCKED | inspect JSON omitted git metadata |
| Node 24.x / `apps/web` root | PASS | engines + `vercel.json` |
| Live `GET /api/public/config` | PASS (after `428d134` deploy) | HTTP 200 `persistencyReady: true` `persistFailure: null` `bookingEnabled: false` `maxGuests: null` |
| Live `GET /api/admin/session` | PASS | `configured: true`, `method: "supabase"`, `authenticated: false` |
| Homepage HTML | NOT RUN (browser UI) | Smoke after this change: `npm run verify:smoke` |

## 2. Defects found

| Defect | Root cause | Fix in this pass |
|---|---|---|
| Homepage/`/stays` inventory error | Linked Supabase had no `public.runtime_state` (`PGRST205`) | Table is now readable (`persistencyReady: true`). Keep applying `20261013140000_runtime_state_upsert.sql` if the lock function is still missing. |
| Overnight capacity message | No published commercial snapshot (`maxGuests` null). Distinct from missing table. | Owner sets Max guests in admin Pricing, then publishes. No invented capacity. |
| Staff auth previously unconfigured | Missing HMAC secret / alias mismatch | Already configured live (`method: supabase`). Logout cookie now matches Secure/SameSite. |
| Availability search wrote `runtime_state` on every read | `searchAvailability`/`createStayQuote` used write lock (`withLock` always `pushStore`) | Switched to `runLockedRead`. |
| Empty-memory availability on Vercel | Search used in-process empty store when persist off | `evaluateAvailability` returns `available: false` when `persistenceMessage()` is set. |
| Persist errors became 500 on holds/payments/events | Only quote/search/config mapped `PersistError` | `persistCatch` on inventory-touching routes → 503 + `persistFailure`. |
| Concurrent last-write-wins | JSON upsert without lock | Additive `upsert_runtime_state` advisory-lock function; persist RPC with upsert fallback. |
| `DEV_STAY_CONFIG_PUBLISH` on Vercel | Could auto-publish env rates | Bootstrap skipped when `VERCEL` is set. |
| `.env.example` unused flags | `BOOKING_ENABLED`, `PROPERTY_TIMEZONE` unused | Documented as unused. |
| No CI / smoke | Historical green build only | `.github/workflows/verify.yml`, `npm run verify:smoke`. |

## 3. Files changed (this pass)

See git diff. Primary: `store.ts`, `persist.ts`, `http.ts`, API routes, `session/route.ts`, migrations `20261013140000_runtime_state_upsert.sql`, scripts, docs, tests.

## 4. Migrations

| File | Status on production | Action |
|---|---|---|
| `20261012120000_vfarms_core.sql` | Unknown (not queried) | Apply only if `properties` missing. Not IF NOT EXISTS for types. |
| `20261012163000_stay_commercial_draft.sql` | Unknown | `IF NOT EXISTS` columns. |
| `20261012193000_room_photographs.sql` | Unknown | Data update only. |
| `20261013123000_runtime_state.sql` | **Not applied** | **Required now.** `CREATE TABLE IF NOT EXISTS`. |
| `20261013140000_runtime_state_upsert.sql` | **Not applied** | Apply after the table exists. App still upserts if RPC missing. |

Runtime inventory is the JSON blob in `runtime_state`, not `stay_bookings` / `inventory_blocks`. Empty row is valid. Do not seed capacity.

## 5. Environment variables

See `docs/PRODUCTION_ENVIRONMENT_AUDIT.md`. Razorpay: absent. Checkout stays unpublished.

## 6. Authentication

| Check | Status |
|---|---|
| Hosted method supabase | PASS (live session JSON) |
| Dev password on Vercel | PASS (code + unit tests) |
| First `admin_profiles` row | BLOCKED (needs owner SQL + Auth user) |
| Login with real owner | NOT RUN |
| Unauthorized `/api/admin/overview` | NOT RUN live; code returns 401 without cookie |
| Cookie httpOnly + Secure on Vercel | PASS (code); logout now uses same flags |

## 7. Inventory and capacity

| Check | Status |
|---|---|
| `runtime_state` exists in production | PASS — live config 200 after SQL (observed 13 Oct 2026 14:12 IST) |
| App can read snapshot | PASS — `persistencyReady: true` |
| App write-back | BLOCKED — no owner publish/write verified in this session |
| Required seed rows | None |
| Owner max guests | BLOCKED — set in admin Pricing, then publish |
| DB failure treated as available | Code fix + unit test; live search still 503 until table exists |

## 8. Booking, events, calendar

| Check | Status |
|---|---|
| Whole-property 5-room inventory | PASS (code + inventory tests) |
| Pending enquiries do not block dates | PASS (unit G08) |
| Concurrent holds same process | PASS (unit G03) |
| Multi-instance conflict | PARTIAL until advisory-lock SQL applied |
| Live booking create | NOT RUN (unpublished + missing table) |
| Event enquiry persist live | BLOCKED (same table) |
| Physical device UI | NOT RUN |

## 9. Razorpay

| Check | Status |
|---|---|
| Keys on Vercel | FAIL / absent |
| Test-mode order → capture → webhook | NOT RUN |
| Checkout signature verify | PASS (unit) |
| Duplicate webhook | PASS (unit, in-process) |
| Live payments | Must stay off |

## 10. Automated checks (this workspace)

| Check | Status |
|---|---|
| Unit tests | PASS — 54 web + 12 inventory |
| Live Supabase integration | NOT RUN — 4 skipped |
| Typecheck | PASS |
| Lint | PASS |
| Production build | PASS |
| Production smoke (`npm run verify:smoke` after `428d134`) | PASS — `/`, `/stays`, config, staff session. Quote still unpublished. |

## 11. Production smoke

`GET /api/public/config` at audit: **FAIL** missing table. `npm run verify:smoke` expected **FAIL** until SQL is applied.

## 12. Git / Vercel after this change

Recorded after commit/push if performed.

## 13. Remaining owner actions

1. Supabase SQL Editor on the **Vercel-linked** project: paste `supabase/migrations/20261013123000_runtime_state.sql`, run; then `20261013140000_runtime_state_upsert.sql`.
2. Read-only: `supabase/verify_required_tables.sql`.
3. Auth → create owner user; SQL `INSERT INTO admin_profiles (id, role, display_name) VALUES ('<uuid>', 'owner', 'Owner');`
4. Sign in at `/admin`. Pricing: real weekday/weekend rates, tax/deposit bps, **max guests**, nights, times, cancellation (≥20 chars), terms/privacy. Save draft. **Do not publish checkout** until inventory + Razorpay test-mode pass.
5. Optional: add Razorpay **test** keys on Preview only.
6. After SQL: hard-refresh `/` and `/stays`; `GET /api/public/config` should be HTTP 200 `persistencyReady: true`. Capacity copy can remain until publish.

## 14. Blockers and risks

- Inventory snapshot is readable. Overnight capacity and rates are still unpublished.
- No published max guests (**blocks honest availability**).
- No Razorpay test verification.
- Rate limit and webhook dedupe are per instance until snapshot persist works.
- Normalized `inventory_blocks` trigger is unused by the app.

## 15. Checkout publish?

**No.** Inventory table missing, capacity unpublished, payments unconfigured.

## 16. Client preview vs production bookings

| Use | Status |
|---|---|
| Public marketing pages (estate, rooms, gallery) | Partial — pages load; stay search shows inventory error until SQL |
| Owner preview of admin after Auth + profile | BLOCKED on profile row |
| Production bookings / real payments | **Not ready** |
