# Security notes

- Service-role and Razorpay secrets are server environment variables only. They are not in the Android app or `NEXT_PUBLIC_*` keys except Razorpay **key id**, which is required for Checkout when payments are configured.
- Admin APIs require a signed staff cookie. Anonymous overview returns 401. Refunds and price publish require owner/admin.
- RLS in the migration allows public read of non-sensitive content only. Customers, payments, bookings, and webhooks are not readable with the anon key.
- Webhook and checkout signatures use HMAC-SHA256 with timing-safe compare. Invalid signatures are rejected in unit tests.
- Rate limiting is in-memory per server instance (best-effort). Use a shared limiter in production.
- Booking lookup without email/phone returns masked guest names only.
- No card data is stored.
- Default production staff passwords are not created.
- This is not a penetration test or legal compliance certification.
