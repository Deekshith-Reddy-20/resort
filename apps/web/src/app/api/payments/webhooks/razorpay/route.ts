import { error, json } from "@/lib/http";
import { verifyWebhookSignature } from "@/lib/payments";
import { applyRazorpayWebhook } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return error("Webhook secret is not configured.", 503);
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature, secret)) {
    return error("Invalid webhook signature.", 400, "INVALID_SIGNATURE");
  }
  let payload: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } };
  };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return error("Invalid webhook payload.", 400);
  }
  const payment = payload.payload?.payment?.entity;
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${payload.event}:${payment?.id ?? ""}`;
  const result = await applyRazorpayWebhook({
    eventId,
    event: payload.event,
    paymentId: payment?.id,
    orderId: payment?.order_id,
  });
  return json(result);
}
