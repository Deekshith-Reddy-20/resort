import { error, json } from "@/lib/http";
import { verifyWebhookSignature } from "@/lib/payments";
import { confirmVerifiedPayment, rememberWebhook } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return error("Webhook secret is not configured.", 503);
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature, secret)) {
    return error("Invalid webhook signature.", 400, "INVALID_SIGNATURE");
  }
  const payload = JSON.parse(raw) as {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } };
  };
  const eventId = req.headers.get("x-razorpay-event-id") ?? payload.event + ":" + payload.payload?.payment?.entity?.id;
  if (eventId && !rememberWebhook(eventId)) {
    return json({ ok: true, duplicate: true });
  }
  const payment = payload.payload?.payment?.entity;
  if (payload.event === "payment.captured" && payment?.id && payment.order_id) {
    const result = await confirmVerifiedPayment({ orderId: payment.order_id, paymentId: payment.id });
    return json({ ok: true, result });
  }
  return json({ ok: true, ignored: payload.event });
}
