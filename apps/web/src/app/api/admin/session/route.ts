import { z } from "zod";
import { error, json, readJson } from "@/lib/http";
import {
  authenticateStaff,
  currentStaff,
  signStaff,
  staffAuthMethod,
  staffConfigured,
  STAFF_COOKIE,
  STAFF_COOKIE_MAX_AGE,
} from "@/lib/staff";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
    maxAge: STAFF_COOKIE_MAX_AGE,
  };
}

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const result = await authenticateStaff(parsed.data.email, parsed.data.password);
  if (!result.ok) return error(result.error, result.status);
  const token = signStaff(result.staff);
  const res = json({ ok: true, role: result.staff.role });
  res.cookies.set(STAFF_COOKIE, token, cookieOptions());
  return res;
}

export async function GET() {
  const staff = await currentStaff();
  if (!staff) {
    return json({
      authenticated: false,
      configured: staffConfigured(),
      method: staffAuthMethod(),
    });
  }
  return json({
    authenticated: true,
    configured: true,
    email: staff.email,
    role: staff.role,
    name: staff.name,
    method: staffAuthMethod(),
  });
}

export async function DELETE() {
  const res = json({ ok: true });
  res.cookies.set(STAFF_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
