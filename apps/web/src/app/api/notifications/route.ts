import { json } from "@/lib/http";

export async function GET() {
  return json({
    notifications: [],
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    pushConfigured: false,
    notice: "Push notifications are not enabled. Transactional email sends only when a provider is configured.",
  });
}
