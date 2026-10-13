# Booking flow test report

Online stay checkout on production must stay **disabled** until persistency, published commercials, and Razorpay verification are confirmed on the deployed host. This file records automated tests run from the repo, not a live payment.

## What the flow requires

1. Guest dates and guest count.
2. Server validation (`isoDate`, name, email, phone, check-out after check-in).
3. Whole-property `canAllocate` (no per-room inventory).
4. Server quote from **published** commercials only.
5. Hold with expiry (`HOLD_MINUTES` / published `holdMinutes`).
6. Razorpay order amount from the server snapshot, not the browser.
7. Checkout HMAC and webhook HMAC.
8. Confirm only after verified capture while the hold is still valid; otherwise `paid_unbooked`.
9. Guest sees server status via `/api/payments/[reference]/status` and `/api/bookings/[reference]`.
10. Staff sees the same rows after `runtime_state` pull.

Pending event enquiries do not block the calendar.

## Automated tests (this workspace)

Commands:

- `npm test` (workspaces)
- `npm run typecheck`
- `npm run lint -w @vfarms/web`
- `npm run build -w @vfarms/web`

Prior session: 46 web + 12 inventory unit tests, typecheck, lint, and web build passed on `8f6a279`.

**This follow-up:** production `GET /api/admin/session` returned `configured: true`, `method: "supabase"`. Production `GET /api/public/config` returned **HTTP 500** (empty body) — persist pull is failing, almost certainly because `runtime_state` is not applied yet. Live table/login/Razorpay still unverified. Checkout remains unpublished.

Covered in unit tests (mocked / in-memory store, no live Razorpay, no production data):

| Case | Where |
|---|---|
| Unauthenticated admin mutations (role matrix) | `admin-auth.test.ts`, `staff-config.test.ts` |
| Dev password disabled on Vercel / production | `staff-config.test.ts` |
| Missing session secret → method `none` | `staff-config.test.ts` |
| Unpublished stay hold refused | `api.test.ts` |
| Occupied dates vs unpublished | `api.test.ts` |
| Concurrent overlapping holds | `api.test.ts` |
| Enquiry does not occupy inventory | `api.test.ts` |
| Expired event hold refuses payment | `api.test.ts` |
| Invalid checkout / webhook signatures | `payments.test.ts` |
| Duplicate webhook event | `staff-config.test.ts` (`applyRazorpayWebhook`) |
| Capture on expired hold → paid_unbooked | `api.test.ts` |
| Client success without verify does not confirm | `api.test.ts` |
| Maintenance blocks stay | `api.test.ts` |
| `DATABASE_MODE=memory` wins on Vercel | `staff-config.test.ts` |

Not run from this workspace (credentials / network / would be destructive):

- Live Supabase `runtime_state` round-trip
- Live Razorpay order or webhook against the merchant account
- Playwright e2e against `https://resort-delta-nine.vercel.app`
- Creating a real Auth user or `admin_profiles` row

## Is online booking ready to enable?

**No**, not from this workspace alone. Enable publish in `/admin` → Pricing only after:

1. Vercel env vars from `docs/VERCEL_ENVIRONMENT_VARIABLES.md` are set and redeployed.
2. Migrations including `runtime_state` are applied.
3. First staff account exists.
4. A test-mode Razorpay capture + webhook confirms a hold on a **non-production** calendar window the owner chooses.
5. The owner has entered real rates (this repo must not invent them).
