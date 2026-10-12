type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max = Number(process.env.RATE_LIMIT_MAX ?? 60), windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000)) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (current.count >= max) {
    return { ok: false, remaining: 0 };
  }
  current.count += 1;
  return { ok: true, remaining: max - current.count };
}

export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
