import { queueNotification, type NotificationRecord } from "./store";

export async function notify(input: {
  type: NotificationRecord["type"];
  to: string;
  subject: string;
  body: string;
}): Promise<NotificationRecord> {
  const record = queueNotification({ ...input, status: "queued" });
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    record.status = "unconfigured";
    record.error = "RESEND_API_KEY or EMAIL_FROM is not configured. Message stored, not sent.";
    return record;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.body,
      }),
    });
    if (!res.ok) {
      record.status = "failed";
      record.error = `Provider returned ${res.status}.`;
      record.retries += 1;
      return record;
    }
    record.status = "sent";
    record.error = undefined;
    return record;
  } catch {
    record.status = "failed";
    record.error = "Provider request failed.";
    record.retries += 1;
    return record;
  }
}
