/**
 * Applies only runtime_state.sql using production env from `vercel env run`.
 * Never prints connection strings or keys.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function env(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value && value !== "[SENSITIVE]") return value;
  }
  return "";
}

const url = env("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_v_farm_resort_SUPABASE_URL", "v_farm_resort_SUPABASE_URL").replace(/\/$/, "");
const service = env("SUPABASE_SERVICE_ROLE_KEY", "v_farm_resort_SUPABASE_SERVICE_ROLE_KEY", "v_farm_resort_SUPABASE_SECRET_KEY");
const postgresUrl = env(
  "v_farm_resort_POSTGRES_URL_NON_POOLING",
  "v_farm_resort_POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_URL",
);

if (url && service) {
  const res = await fetch(`${url}/rest/v1/runtime_state?select=property_slug&limit=1`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  });
  const body = await res.text();
  let code = "";
  try {
    code = JSON.parse(body)?.code ?? "";
  } catch {
    code = "";
  }
  console.log("precheck runtime_state", res.status, code || res.statusText);
  if (res.ok) {
    console.log("runtime_state already reachable; no DDL applied");
    process.exit(0);
  }
}

if (!postgresUrl) {
  console.error("No Postgres URL in the injected environment. Apply supabase/migrations/20261013123000_runtime_state.sql in the SQL editor.");
  process.exit(2);
}

const postgres = (await import("postgres")).default;
const sql = postgres(postgresUrl, { ssl: "require", max: 1, connection: { application_name: "vfarms-migrate" } });
const files = [
  join("supabase", "migrations", "20261013123000_runtime_state.sql"),
  join("supabase", "migrations", "20261013140000_runtime_state_upsert.sql"),
];
try {
  for (const file of files) {
    await sql.unsafe(readFileSync(file, "utf8"));
    console.log("applied", file);
  }
  const tables = await sql`select to_regclass('public.runtime_state') as exists`;
  console.log("runtime_state exists", Boolean(tables[0]?.exists));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("migration failed", message.slice(0, 240));
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
