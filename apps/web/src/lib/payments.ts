import { createHmac, timingSafeEqual } from "crypto";

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function verifyCheckoutSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", args.secret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(args.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createRazorpayOrder(args: {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) {
    throw new Error("RAZORPAY_NOT_CONFIGURED");
  }
  const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: args.amountMinor,
      currency: args.currency,
      receipt: args.receipt,
      notes: args.notes,
      payment_capture: 1,
    }),
  });
  if (!res.ok) {
    throw new Error("RAZORPAY_ORDER_FAILED");
  }
  return res.json() as Promise<{ id: string; amount: number; currency: string }>;
}
