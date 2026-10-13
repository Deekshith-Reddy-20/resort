# V-Farms test evidence

Environment: local `http://localhost:3000` (when `npm run dev` is running). Time zone for operational “today”: Asia/Kolkata.

## Commands

| Command | Latest result | Notes |
|---|---|---|
| `npm run typecheck -w @vfarms/web` | PASS (13 Oct 2026 local) | TypeScript |
| `npm run lint -w @vfarms/web` | PASS | next lint, 0 warnings |
| `npm run test` | PASS 33 web + 12 inventory (13 Oct 2026) | G09/G13/G14/P01/P05/A04 + event-hold expiry |
| `npm run test:e2e` | NOT RE-RUN this phase | Prior public suite was 5/5; hero CTA text changed — re-run before launch |
| `npm run build` | NOT TESTED this phase | Required before launch |
| Android assemble | NOT TESTED this phase | Out of PDF MVP |
| Field Lighthouse / CWV | NOT TESTED | Do not claim LCP/INP/CLS |
| Backup restore A06 | NOT TESTED | Needs staging Supabase |
| Live Razorpay P01 | NOT TESTED | Test keys may exist locally; live blocked |

## Automated cases mapped to PRD

| ID | Status | Evidence |
|---|---|---|
| G01 | TESTED (unit + e2e) | `tests/rooms.test.ts`, `e2e/public.spec.ts` |
| G02 | TESTED (unit) | `createStayQuote` when published |
| G03 | TESTED (unit) | concurrent hold rejection |
| G04–G07 | TESTED (inventory) | `packages/inventory/tests/conflicts.test.ts` |
| G08 | TESTED | enquiry does not occupy |
| G09 | TESTED | `acceptQuote` rejected after stay occupies the date (`api.test.ts`) |
| G10 | TESTED | expired hold cannot prepare payment |
| G11 | TESTED | capacity rejection |
| G12 | PARTIAL | quote recalculates on date change in StayFlow; dedicated mutation API later |
| G13 | TESTED | `addMaintenance` then stay hold rejected |
| G14 | TESTED | seasonal night amount in `conflicts.test.ts` |
| G15 | NOT TESTED (lab devices) | Responsive CSS present; no signed device matrix |
| P01 | TESTED (store) | captured payment on active hold confirms stay; live Razorpay Checkout NOT TESTED |
| P02 | TESTED | client success without verify does not confirm |
| P03 | TESTED | invalid signatures rejected |
| P04 | TESTED | `rememberWebhook` duplicate |
| P05 | TESTED (partial) | later `failed` after capture is ignored; full webhook reorder matrix not automated |
| P06 | TESTED | paid-unbooked |
| P07–P08 | PARTIAL / NOT TESTED | exceptions list; refund is recorded, not gateway-complete |
| A01 | TESTED (logic) | unauthenticated admin mutations require `currentStaff` |
| A02 | TESTED | `can("content","refund") === false` |
| A03 | TESTED (engine) | admin maintenance conflict |
| A04 | TESTED | republish rates leaves held `priceSnapshot` unchanged |
| A05 | PARTIAL | no `NEXT_PUBLIC_` Razorpay secret; no CI secret scan job |
| A06–A07 | NOT TESTED | backups / email retry in staging |

## Manual checks this phase

- Public routes remain `/`, `/estate`, `/rooms`, `/stays`, `/events`, `/gallery`, `/contact`, `/admin`.
- Room CTAs go to `/stays` only.
- Admin placeholder modules replaced with store-backed forms.

Unverified items stay **NOT TESTED**, not done.
