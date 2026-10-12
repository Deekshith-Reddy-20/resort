# Deployment

## Website (Vercel)

1. Create a Vercel project from this repository, root or `apps/web`.
2. Set environment variables from `.env.example`. Never expose `SUPABASE_SERVICE_ROLE_KEY` or Razorpay secrets with a `NEXT_PUBLIC_` prefix.
3. Deploy Preview first.
4. Configure Razorpay **test** keys and webhook URL `https://<domain>/api/payments/webhooks/razorpay`.
5. Keep `RAZORPAY_LIVE_MODE=false` until the owner completes merchant onboarding and a refund rehearsal.
6. Point the custom domain when ready.

Rollback: revert the Vercel deployment. Database rollback requires a Supabase backup; do not accept live payments without a tested restore.

## Android release

1. Agree `applicationId` `com.vfarms.resort`.
2. Generate an upload keystore **off-repo**.
3. Set `API_BASE_URL` to the production HTTPS API.
4. `gradlew :app:bundleRelease` from `apps/android` after JDK/SDK are installed.
5. Google Play internal testing: privacy policy URL, data-safety form, screenshots. Do not publish automatically.

## Production smoke checklist

- Homepage video or poster loads.
- Room pages have no individual checkout.
- Availability search hits `/api/availability/search`.
- Stay hold refused when rates unpublished.
- Event enquiry does not block dates.
- Invalid Razorpay signature rejected.
- Admin unauthorized mutation returns 401/403.
