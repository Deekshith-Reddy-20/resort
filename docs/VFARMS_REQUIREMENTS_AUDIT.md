# V-Farms requirements traceability (PRD V1.1, 12 Oct 2026)

Invariant: **V-Farms is one property-wide booking inventory for both stays and events.**

Statuses: COMPLETE, PARTIAL, MISSING, BROKEN, MOCKED, INSECURE, NOT TESTED.

| ID | PDF | Expected | Location | Status | Evidence | Required changes / blockers | Acceptance |
|---|---|---|---|---|---|---|---|
| INV-01 | p.9 | One sellable property | `packages/inventory`, `store.ts` | COMPLETE | Holds/stays/events use `PROPERTY_ID` only | Keep; never add room SKUs | G01–G14 |
| INV-02–05 | p.9 | Stay/event/hold/closure conflicts | `packages/inventory/src/conflicts.ts` | COMPLETE | Inventory unit tests G04–G07 | Owner turnover default is enabled for stays | Unit tests green |
| INV-06 | p.9 | Atomic hold + price | `store.ts` `withLock` | PARTIAL | In-process mutex, not Postgres lock | Wire `DATABASE_MODE=supabase` | Concurrent hold test G03 |
| INV-07 | p.9 | Late payment → paid-unbooked | `confirmVerifiedPayment` | COMPLETE | `tests/api.test.ts` INV-07 | Owner refund process | Flag exception |
| INV-08 | p.8–9 | Enquiry is not a hold | `createEventEnquiry` | COMPLETE | G08 test | — | Enquiry recorded, dates free |
| INV-09 | p.9 | Admin uses same engine | `addMaintenance`, `acceptQuote` | COMPLETE | Maintenance uses `canAllocate` | — | G13 |
| Stay journey | p.7 | Search → hold → pay → confirm | `/stays`, `/booking/[reference]` | PARTIAL | Server quote/hold/Razorpay verify | Email, live merchant, published rates | P01–P02 |
| Event journey | p.8 | Enquire → quote → accept → deposit | `/events`, `/api/admin/quotes` | PARTIAL | Enquiry + issue + accept + hold | Event types/capacity owner P0 | Soft enquiry never blocks |
| Rooms | p.5 | Five profiles, no room checkout | `/rooms`, `RoomShowcase` | COMPLETE | e2e + `rooms.test.ts` | Bed/size/amenities unpublished | G01 |
| Estate map | p.6 | Schematic + fallback text | `EstateSchematic`, admin Map | PARTIAL | Labelled schematic only | Owner survey/drone | No invented coords |
| Home CTAs | p.4 | Book Entire Resort / Plan an Event | `HeroVideo`, `MobileDock` | COMPLETE | Copy updated | — | Visible on `/` |
| CMS | p.5 | Owner-editable public copy | `/api/admin/content` | PARTIAL | Draft/publish in memory | Supabase persistence | Unpublished stays private |
| Admin overview | p.13 | Real metrics | `adminOverview()` | PARTIAL | Derived from store, not demo constants | Persistence | Arrivals use IST date |
| Admin calendar | p.13 | Unified list + filters | `AdminDashboard` Calendar | PARTIAL | List + type filter; no month grid widget | — | Soft quotes labelled |
| Admin quotes | p.13 | Issue dated quotes | `/api/admin/quotes` | PARTIAL | Issue form; no revise/version UI | — | Quote does not hold |
| Payments | p.12 | Verify, idempotent webhooks | Razorpay routes | PARTIAL | Signatures + dedupe tested | Live keys, refund gateway | P03–P06 |
| Refunds | p.12 | Authorized record + reason | `/api/admin/refunds` | PARTIAL | Record only; no Razorpay refund API | Owner + merchant | A02 denies content role |
| Email | p.11 | Transactional + delivery state | `notify.ts`, notifications table | PARTIAL | Stored; send only if Resend configured | `RESEND_API_KEY`, `EMAIL_FROM` | Never claim delivery |
| Staff auth | p.16 | Supabase Auth + RBAC | `staff.ts`, cookie session | PARTIAL | Dev email/password + role `can()` | No default prod password; MFA NOT TESTED | A01 401 |
| Secret fallback | p.16 | No service-role as session secret | `staff.ts` | COMPLETE | Uses `STAFF_SESSION_SECRET` only | Set the secret | Session fails if unset |
| Persistence | p.14–15 | Supabase source of truth | SQL migrations exist; APIs use memory | MISSING (runtime) | `DATABASE_MODE=memory` default | Owner Supabase project | Repeatable after restart |
| Android | p.3 later | Out of PDF MVP | `apps/android` exists | NOT TESTED this pass | Prior assemble | Out of this PDF MVP | — |
| CWV | p.16 | LCP/INP/CLS field | — | NOT TESTED | No field RUM | Measure on preview | Do not claim targets |
| Backups | p.16 | Restore drill | docs only | NOT TESTED | No staging restore | Owner Supabase PITR | A06 |
| Legal/GST | p.16, 22 | Permits, tax class | Legal pages are drafts | OWNER | Not engineering | Qualified adviser | Do not claim compliance |

Owner P0 blockers (PDF p.22): event types/attendance, hours/buffers, overnight inclusions, rates/deposits/cancellation, permits/insurance, Razorpay live onboarding.
