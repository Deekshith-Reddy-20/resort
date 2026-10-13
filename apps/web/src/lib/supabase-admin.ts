import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
}

export function supabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
}

export function supabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
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
