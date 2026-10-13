/**
 * Copies Vercel Supabase integration keys onto the names the Next.js app reads.
 * Refuses redacted CLI placeholders. Does not print secret values.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[line.slice(0, i)] = value.replace(/\\n/g, "\n");
  }
  return out;
}

function usable(value) {
  return Boolean(value) && value !== "[SENSITIVE]" && value.length >= 20;
}

function addEnv(name, value, { sensitive, environments = "production,preview" }) {
  if (!value) {
    console.error(`skip ${name}: source empty`);
    return false;
  }
  const args = [
    "vercel",
    "env",
    "add",
    name,
    environments,
    "--yes",
    "--force",
    sensitive ? "--sensitive" : "--no-sensitive",
  ];
  const result = spawnSync("npx", args, {
    input: `${value}\n`,
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`fail ${name}: ${(result.stderr || result.stdout || "").slice(0, 400)}`);
    return false;
  }
  console.log(`set ${name} (${sensitive ? "secret" : "plain"})`);
  return true;
}

const pull = spawnSync(
  "npx",
  ["vercel", "env", "pull", ".env.vercel.production", "--environment", "production", "--yes"],
  { encoding: "utf8", shell: true },
);
if (pull.status !== 0) {
  console.error((pull.stderr || pull.stdout || "").slice(0, 400));
  process.exit(1);
}

const env = parseEnv(readFileSync(".env.vercel.production", "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_v_farm_resort_SUPABASE_URL || env.v_farm_resort_SUPABASE_URL;
const anon =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_v_farm_resort_SUPABASE_ANON_KEY ||
  env.v_farm_resort_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY || env.v_farm_resort_SUPABASE_SERVICE_ROLE_KEY;

if (!usable(url) || !usable(anon) || !usable(service)) {
  console.error("Pulled integration secrets are redacted. Copy them in the Vercel dashboard onto the canonical names. See docs/VERCEL_ENVIRONMENT_VARIABLES.md.");
}

let ok = true;
if (usable(url)) ok = addEnv("NEXT_PUBLIC_SUPABASE_URL", url, { sensitive: false }) && ok;
if (usable(anon)) ok = addEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", anon, { sensitive: true }) && ok;
if (usable(service)) ok = addEnv("SUPABASE_SERVICE_ROLE_KEY", service, { sensitive: true }) && ok;
ok = addEnv("DATABASE_MODE", "supabase", { sensitive: false }) && ok;
ok = addEnv("NEXT_PUBLIC_SITE_URL", "https://resort-delta-nine.vercel.app", { sensitive: false }) && ok;
ok = addEnv("STAFF_SESSION_SECRET", env.STAFF_SESSION_SECRET && usable(env.STAFF_SESSION_SECRET) ? env.STAFF_SESSION_SECRET : randomBytes(32).toString("hex"), {
  sensitive: true,
}) && ok;
ok = addEnv("PROPERTY_ID", "vfarms-hyderabad", { sensitive: false }) && ok;

if (!ok) process.exit(1);
console.log("non-secret hosted names are in place. Redeploy is required.");
