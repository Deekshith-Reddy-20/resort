import { json, persistCatch } from "@/lib/http";
import { currentStaff } from "@/lib/staff";
import { listNotifications, runLockedRead } from "@/lib/store";

export async function GET() {
  const staff = await currentStaff();
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  if (!staff) {
    return json({
      notifications: [],
      emailConfigured,
      pushConfigured: false,
      notice: "Push notifications are not enabled. Transactional email sends only when a provider is configured.",
    });
  }
  try {
    return json({
      notifications: await runLockedRead(() => listNotifications()),
      emailConfigured,
      pushConfigured: false,
      notice: emailConfigured
        ? "Email provider keys are present. Delivery is recorded only after the provider accepts the message."
        : "RESEND_API_KEY and EMAIL_FROM are missing. Messages are stored as unconfigured, not delivered.",
    });
  } catch (e) {
    return persistCatch(e, "Notifications could not be loaded.");
  }
}
