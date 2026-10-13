# V-Farms implementation plan (post-audit)

## Already in the repository (retained)

- Next.js App Router public site, Tailwind tokens, cinematic hero from `vfarms-resort.mp4`.
- Owner bedroom PNGs for Rooms 1–5; informational only.
- Property-level inventory engine and stay hold/quote APIs.
- Razorpay order + checkout verify + webhook HMAC + paid-unbooked.
- Admin draft → publish stay commercials.
- Android app exists but is **out of PDF MVP scope**.

## This phase (implemented)

1. Requirements docs and honest status labels.
2. Admin dashboard modules backed by the same store: overview metrics, calendar filters, event review/decline, quotes, operations notes, refund **records**, CMS draft/publish, map zones, communications log, integration status.
3. Staff session secret no longer falls back to the Supabase service role.
4. Public CTAs match PRD: Book Entire Resort / Plan an Event.
5. Keyboard-accessible estate schematic (labelled, not surveyed).
6. Notification records; email send only when Resend is configured.
7. Authorization unit tests for content vs refund.

## Next engineering (P0)

1. Switch APIs to Supabase with transactional locks and RLS (migrations already drafted).
2. Named staff via Supabase Auth + MFA for owner.
3. Razorpay refund API + daily reconciliation job.
4. Preview deploy + field CWV and backup restore (A06).

## Owner (cannot be coded away)

Publish rates, capacity, times, event types, legal copy, contact, surveyed map, live merchant, email domain.
