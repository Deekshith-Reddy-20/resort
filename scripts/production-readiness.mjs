/**
 * Repeatable verification. Never prints secret values. Never mutates production data.
 * 1. Required env *names* presence via injected process.env (use: npx vercel env run -e production -- npm run verify:readiness)
 * 2. Delegates live HTTP checks to smoke-production.mjs
 */
import { spawnSync } from "node:child_process";

const requiredAny = [
  ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_v_farm_resort_SUPABASE_URL", "v_farm_resort_SUPABASE_URL"],
  ["SUPABASE_SERVICE_ROLE_KEY", "v_farm_resort_SUPABASE_SERVICE_ROLE_KEY", "v_farm_resort_SUPABASE_SECRET_KEY"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_v_farm_resort_SUPABASE_ANON_KEY", "v_farm_resort_SUPABASE_ANON_KEY", "NEXT_PUBLIC_v_farm_resort_SUPABASE_PUBLISHABLE_KEY"],
  ["STAFF_SESSION_SECRET"],
  ["DATABASE_MODE"],
  ["PROPERTY_ID"],
];

function present(name) {
  const value = process.env[name]?.trim() || "";
  return Boolean(value) && value !== "[SENSITIVE]";
}

let envFailed = 0;
for (const group of requiredAny) {
  const ok = group.some(present);
  console.log(ok ? "PASS env" : "FAIL env", group[0], ok ? "present (aliases allowed)" : "missing (all aliases empty or redacted)");
  if (!ok) envFailed += 1;
}

if (process.env.DATABASE_MODE === "memory") {
  console.error("FAIL DATABASE_MODE=memory is not valid on a hosted booking host");
  envFailed += 1;
}

if (process.env.STAFF_ALLOW_DEV_PASSWORD === "true" && process.env.VERCEL) {
  console.error("FAIL STAFF_ALLOW_DEV_PASSWORD must not be true on Vercel");
  envFailed += 1;
}

console.log("RAZORPAY_KEY_ID", present("RAZORPAY_KEY_ID") ? "present" : "absent");
console.log("RAZORPAY_KEY_SECRET", present("RAZORPAY_KEY_SECRET") ? "present" : "absent");
console.log("RAZORPAY_WEBHOOK_SECRET", present("RAZORPAY_WEBHOOK_SECRET") ? "present" : "absent");

const smoke = spawnSync(process.execPath, ["scripts/smoke-production.mjs"], { stdio: "inherit" });
if (envFailed || smoke.status !== 0) {
  process.exit(1);
}
