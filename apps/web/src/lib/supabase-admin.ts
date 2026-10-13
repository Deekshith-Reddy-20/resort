import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim() || "";
    if (value && value !== "[SENSITIVE]") return value;
  }
  return "";
}

/**
 * Canonical names plus the Vercel Supabase integration prefix used on this project.
 * Never treat a redacted CLI placeholder as a real credential.
 */
export function supabaseUrl() {
  return firstEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_v_farm_resort_SUPABASE_URL", "v_farm_resort_SUPABASE_URL");
}

export function supabaseAnonKey() {
  return firstEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_v_farm_resort_SUPABASE_ANON_KEY",
    "v_farm_resort_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_v_farm_resort_SUPABASE_PUBLISHABLE_KEY",
    "v_farm_resort_SUPABASE_PUBLISHABLE_KEY",
  );
}

export function supabaseServiceKey() {
  return firstEnv("SUPABASE_SERVICE_ROLE_KEY", "v_farm_resort_SUPABASE_SERVICE_ROLE_KEY", "v_farm_resort_SUPABASE_SECRET_KEY");
}

export function supabaseAuthConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

export function supabasePersistenceConfigured() {
  return Boolean(supabaseUrl() && supabaseServiceKey());
}

export function usingSupabaseStore() {
  if (process.env.DATABASE_MODE === "memory") return false;
  if (process.env.DATABASE_MODE === "supabase") return supabasePersistenceConfigured();
  return Boolean(process.env.VERCEL) && supabasePersistenceConfigured();
}

/** Server-only. Never import this into a client component. */
export function serviceClient(): SupabaseClient | null {
  if (!supabasePersistenceConfigured()) return null;
  return createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonAuthClient(): SupabaseClient | null {
  if (!supabaseAuthConfigured()) return null;
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
