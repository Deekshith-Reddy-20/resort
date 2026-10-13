import { supabaseAnonKey, supabasePersistenceConfigured, supabaseServiceKey, supabaseUrl } from "./supabase-admin";

function present(value: string | undefined) {
  return Boolean(value?.trim());
}

/** Names only. Never return secret values. */
export function missingPersistenceEnv(): string[] {
  const missing: string[] = [];
  if (!present(supabaseUrl())) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!present(supabaseServiceKey())) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (process.env.VERCEL && process.env.DATABASE_MODE === "memory") missing.push("DATABASE_MODE");
  if (process.env.VERCEL && process.env.DATABASE_MODE !== "supabase" && !supabasePersistenceConfigured()) {
    missing.push("DATABASE_MODE");
  }
  return [...new Set(missing)];
}

export function missingStaffAuthEnv(): string[] {
  const missing: string[] = [];
  if (!present(process.env.STAFF_SESSION_SECRET)) missing.push("STAFF_SESSION_SECRET");
  if (!present(supabaseUrl())) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!present(supabaseAnonKey())) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!present(supabaseServiceKey())) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

export function persistenceMessage(): string | null {
  if (!process.env.VERCEL) return null;
  if (supabasePersistenceConfigured() && process.env.DATABASE_MODE !== "memory") return null;
  const missing = missingPersistenceEnv();
  if (missing.length) {
    return `Database persistence is not configured on this host. Missing ${missing.join(", ")}. Apply migrations including runtime_state, then set DATABASE_MODE=supabase.`;
  }
  return "Database persistence is not configured on this host. Set DATABASE_MODE=supabase.";
}

export function staffAuthUnconfiguredMessage() {
  const missing = missingStaffAuthEnv();
  if (!missing.length) {
    return "Staff authentication is configured. Sign in with an authorized Supabase Auth account that has an admin_profiles row.";
  }
  return `Staff authentication is not configured on the server. Missing ${missing.join(", ")}. Hosted sites use Supabase Auth plus an admin_profiles row. Development passwords are not used in production.`;
}
