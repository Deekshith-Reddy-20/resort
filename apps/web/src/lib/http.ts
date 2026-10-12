import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "./rate-limit";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400, code?: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

export async function readJson<T>(req: Request, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const limited = rateLimit(clientKey(req.headers));
  if (!limited.ok) return { ok: false, response: error("Too many requests.", 429, "RATE_LIMIT") };
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: error("Invalid JSON body.", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: error(parsed.error.issues[0]?.message ?? "Invalid input.", 400, "VALIDATION"),
    };
  }
  return { ok: true, data: parsed.data };
}

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be YYYY-MM-DD");
export const email = z.string().email();
export const phone = z.string().min(8).max(20);
export const personName = z.string().min(2).max(80);
