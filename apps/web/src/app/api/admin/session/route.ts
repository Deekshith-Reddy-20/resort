import { z } from "zod";
import { error, json, readJson } from "@/lib/http";
import { currentStaff, signStaff, STAFF_COOKIE, staffConfigured } from "@/lib/staff";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  if (!staffConfigured()) {
    return error("Staff authentication is not configured. Set STAFF_SESSION_SECRET and STAFF_DEV_EMAIL in a secure environment.", 503);
  }
  const allowedEmail = process.env.STAFF_DEV_EMAIL;
  const allowedPassword = process.env.STAFF_DEV_PASSWORD;
  if (!allowedEmail || !allowedPassword) {
    return error("Use Supabase Auth for staff accounts. Development password login is not enabled.", 503);
  }
  if (parsed.data.email !== allowedEmail || parsed.data.password !== allowedPassword) {
    return error("Invalid credentials.", 401);
  }
  const token = signStaff({ email: parsed.data.email, role: "owner", name: "Owner" });
  const res = json({ ok: true, role: "owner" });
  res.cookies.set(STAFF_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  return res;
}

export async function GET() {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  return json({ email: staff.email, role: staff.role, name: staff.name });
}

export async function DELETE() {
  const res = json({ ok: true });
  res.cookies.set(STAFF_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
