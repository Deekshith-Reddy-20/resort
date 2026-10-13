import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "vfarms_staff";

function secret() {
  return process.env.STAFF_SESSION_SECRET || "";
}

export function staffConfigured() {
  return Boolean(secret() && (process.env.STAFF_DEV_EMAIL || process.env.NEXT_PUBLIC_SUPABASE_URL));
}

export function signStaff(payload: { email: string; role: string; name: string }) {
  const s = secret();
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 12 * 3600_000 })).toString("base64url");
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
