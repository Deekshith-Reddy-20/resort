# V-Farms architecture

V-Farms is one property-wide booking inventory for both stays and events.

## Layout

- `apps/web` — Next.js App Router website, admin dashboard, and authoritative HTTP APIs.
- `apps/android` — native Kotlin + Jetpack Compose client. Not a WebView wrapper.
- `packages/inventory` — shared stay/event conflict and pricing engine used by the API and tests.
- `packages/contracts` — OpenAPI description of the shared API.
- `supabase/migrations` — PostgreSQL schema, inventory trigger, RLS.
- `docs` — setup, deployment, security, and owner decisions.

## Source of truth

Website and Android call the same `/api/*` routes. Clients never decide availability, price, payment success, or reservation status.

`DATABASE_MODE=memory` (default) persists in the Next.js server process for local development and unit tests. Production must use Supabase (`DATABASE_MODE=supabase` after the adapter is wired to the migrated project). The SQL migration already encodes the same conflict rules via `vfarms_inventory_guard`.

## Products

1. Whole-property stay: nights `[check_in, check_out)`, all five rooms included.
2. Exclusive event: enquiry → owner quote → accept → hold → verified payment.

Unapproved enquiries do not occupy inventory.
