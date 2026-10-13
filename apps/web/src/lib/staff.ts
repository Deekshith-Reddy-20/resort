import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { anonAuthClient, serviceClient, supabaseAuthConfigured } from "./supabase-admin";

const COOKIE = "vfarms_staff";
const MAX_AGE_MS = 12 * 3600_000;

function secret() {
  return process.env.STAFF_SESSION_SECRET || "";
}

/** Password login against STAFF_DEV_* is local development only. Never on Vercel. */
export function allowDevPasswordLogin() {
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.STAFF_ALLOW_DEV_PASSWORD !== "true") return false;
  return Boolean(process.env.STAFF_DEV_EMAIL && process.env.STAFF_DEV_PASSWORD && secret());
}

export function staffAuthMethod(): "dev" | "supabase" | "none" {
  if (allowDevPasswordLogin()) return "dev";
  if (secret() && supabaseAuthConfigured()) return "supabase";
  return "none";
}

export function staffConfigured() {
  return staffAuthMethod() !== "none";
}

export function signStaff(payload: { email: string; role: string; name: string }) {
  const s = secret();
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + MAX_AGE_MS })).toString("base64url");
  const sig = createHmac("sha256", s).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readStaffToken(token: string) {
  const s = secret();
  if (!s) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", s).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
    email: string;
    role: string;
    name: string;
    exp: number;
  };
  if (payload.exp < Date.now()) return null;
  return payload;
}

export async function currentStaff() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return readStaffToken(token);
}

export async function authenticateStaff(email: string, password: string) {
  if (!secret()) {
    return { ok: false as const, status: 503, error: "STAFF_SESSION_SECRET is not configured on the server." };
  }
  if (allowDevPasswordLogin()) {
    if (email !== process.env.STAFF_DEV_EMAIL || password !== process.env.STAFF_DEV_PASSWORD) {
      return { ok: false as const, status: 401, error: "Invalid credentials." };
    }
    return {
      ok: true as const,
      staff: { email, role: "owner", name: "Owner" },
    };
  }
  if (!supabaseAuthConfigured()) {
    return {
      ok: false as const,
      status: 503,
      error: "Staff authentication is not configured. Hosted environments must use Supabase Auth plus STAFF_SESSION_SECRET.",
    };
  }
  const auth = anonAuthClient();
  if (!auth) {
    return { ok: false as const, status: 503, error: "Supabase Auth is not configured." };
  }
  const signed = await auth.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.user) {
    return { ok: false as const, status: 401, error: "Invalid credentials." };
  }
  const admin = serviceClient();
  if (!admin) {
    return {
      ok: false as const,
      status: 503,
      error: "SUPABASE_SERVICE_ROLE_KEY is required to verify authorized staff roles.",
    };
  }
  const profile = await admin.from("admin_profiles").select("role, display_name").eq("id", signed.data.user.id).maybeSingle();
  if (profile.error) {
    console.error("admin_profiles lookup failed", profile.error.code);
    return { ok: false as const, status: 503, error: "Staff directory is unavailable." };
  }
  if (!profile.data) {
    return { ok: false as const, status: 403, error: "This account is not an authorized V-Farms staff member." };
  }
  return {
    ok: true as const,
    staff: {
      email: signed.data.user.email ?? email,
      role: String(profile.data.role),
      name: String(profile.data.display_name),
    },
  };
}

export function can(role: string, action: "refund" | "pricing" | "content" | "reservations" | "ops" | "audit") {
  if (role === "owner" || role === "admin") return true;
  if (action === "refund" || action === "pricing" || action === "audit") return false;
  if (action === "content") return role === "content";
  if (action === "reservations") return role === "reservations";
  if (action === "ops") return role === "operations" || role === "reservations";
  return false;
}

export function authorize(role: string, action: Parameters<typeof can>[1]) {
  return can(role, action);
}

export const STAFF_COOKIE = COOKIE;
export const STAFF_COOKIE_MAX_AGE = Math.floor(MAX_AGE_MS / 1000);
