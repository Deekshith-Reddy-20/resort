# Local setup

## Website

```bash
cd "c:\Users\littu\OneDrive\Desktop\v farm"
copy .env.example apps\web\.env.local
npm install
npm run dev
```

Open http://localhost:3000

## Tests

```bash
npm run test:inventory
npm run test:web
npm run typecheck
npm run lint
npm run build
```

End-to-end:

```bash
npx playwright install
npm run test:e2e
```

## Staff login (local only)

Set in `apps/web/.env.local`:

```
STAFF_SESSION_SECRET=generate-a-long-random-string
STAFF_DEV_EMAIL=owner@example.com
STAFF_DEV_PASSWORD=a-long-local-only-password
```

Do not use these values in production. Create staff in Supabase Auth instead.

## Android

1. Install Android Studio, JDK 17, and Android SDK 35.
2. Copy `apps/android/local.properties.example` to `apps/android/local.properties`.
3. Point `sdk.dir` at your SDK.
4. Run the Next.js API.
5. From Android Studio open `apps/android` and assemble Debug.

The app talks to `http://10.0.2.2:3000/` on the emulator. No Razorpay or Supabase secrets are packaged in the APK.

## Supabase

Apply `supabase/migrations/20261012120000_vfarms_core.sql` to a project, then set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (server only). Database policy SQL tests are in `supabase/tests/inventory_policy.sql` and are **NOT TESTED** until a database exists.
