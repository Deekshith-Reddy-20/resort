# Test and build results (12 October 2026)

## Ran

| Check | Result |
| Inventory unit tests (`npm run test:inventory`) | PASS — 11 tests |
| Web unit tests (`npm run test:web`) | PASS — 8 tests (payments signatures, rooms not bookable, concurrent holds, enquiry does not block, unpaid hold not confirmed, paid-unbooked) |
| Typecheck | PASS |
| Website lint | PASS |
| Production website build | PASS — Next.js 15.5.27, 48 pages |
| HTTP smoke of public routes | PASS — all listed pages HTTP 200; no “Book this room” copy |
| `GET /api/public/rooms` | PASS — `bookable: false` for five rooms |
| `POST /api/pricing/quote` unpublished rates | PASS — `totalMinor: null`, booking disabled |
| `POST /api/events/enquiries` | PASS — enquiry recorded, not a booking |
| `GET /api/admin/overview` anonymous | PASS — 401 |
| `POST /api/payments/orders` without Razorpay | PASS — 503 `PAYMENTS_NOT_CONFIGURED` |

## NOT TESTED

| Check | Reason |
| Playwright e2e | PASS — 3 tests (home, room informational CTA, gallery) |
| Supabase migration + RLS SQL tests | No Supabase project provisioned |
| Razorpay live/test checkout and webhooks against Razorpay | Credentials not supplied |
| Email delivery | Provider not configured |
| Android Gradle assemble/lint | JDK and Android SDK not installed on this machine |
| Emulator / device smoke | No emulator |
| Push notifications | FCM not configured |
| Secret scanning in CI | CI not connected |
| Database concurrency under Postgres | Memory-lock tests cover the TypeScript engine; SQL trigger tests need Postgres |
