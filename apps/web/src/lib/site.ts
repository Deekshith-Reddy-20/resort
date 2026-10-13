/**
 * Canonical public origin. Never trust a client-supplied Host header for payments or auth.
 * Vercel sets VERCEL_URL per deployment (no protocol). Prefer an explicit NEXT_PUBLIC_SITE_URL
 * once the preview or production hostname is known.
 */
export function publicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      const url = new URL(explicit.includes("://") ? explicit : `https://${explicit}`);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("unsupported protocol");
      }
      return url.origin;
    } catch {
      /* fall through */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

export function isVercelPreview(): boolean {
  return process.env.VERCEL_ENV === "preview" || (Boolean(process.env.VERCEL) && process.env.VERCEL_ENV !== "production");
}
