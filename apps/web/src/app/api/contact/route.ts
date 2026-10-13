import { z } from "zod";
import { email, json, personName, phone, readJson } from "@/lib/http";
import { addContact, runLocked } from "@/lib/store";

const schema = z.object({
  name: personName,
  email,
  phone: phone.optional(),
  message: z.string().min(10).max(2000),
});

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  await runLocked(() =>
    addContact({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
      createdAt: new Date().toISOString(),
    }),
  );
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  return json({
    ok: true,
    delivered: false,
    notice: emailConfigured
      ? "Message stored. Outbound email delivery is configured separately and is NOT TESTED until a provider is verified."
      : "Message stored for the owner. Email delivery is not configured.",
  });
}
