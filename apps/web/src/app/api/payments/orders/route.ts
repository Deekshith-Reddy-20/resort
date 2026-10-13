import { z } from "zod";
import { error, json, readJson } from "@/lib/http";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/payments";
import { attachOrder, preparePayment, runLocked } from "@/lib/store";

const schema = z.object({
  stayReference: z.string().optional(),
  quoteReference: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  if (!parsed.data.stayReference && !parsed.data.quoteReference) {
    return error("A stay or quote reference is required.");
  }
  if (!razorpayConfigured()) {
    return error("Payments are not configured. Razorpay test credentials are required.", 503, "PAYMENTS_NOT_CONFIGURED");
  }
  const prepared = await runLocked(() => preparePayment(parsed.data));
  if (!prepared.ok) {
    return error(prepared.error, prepared.status, "code" in prepared ? prepared.code : undefined);
  }
  if (prepared.existingOrderId) {
    return json({
      orderId: prepared.existingOrderId,
      amount: prepared.amountMinor,
      currency: prepared.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      receipt: prepared.reference,
      reused: true,
    });
  }
  try {
    const order = await createRazorpayOrder({
      amountMinor: prepared.amountMinor,
      currency: prepared.currency,
      receipt: prepared.reference,
      notes: {
        stayReference: parsed.data.stayReference ?? "",
        quoteReference: parsed.data.quoteReference ?? "",
      },
    });
    if (order.amount !== prepared.amountMinor || order.currency !== prepared.currency) {
      return error("Razorpay returned an amount that does not match the server quote.", 502, "AMOUNT_MISMATCH");
    }
    await attachOrder({
      stayReference: parsed.data.stayReference,
      quoteReference: parsed.data.quoteReference,
      orderId: order.id,
      amountMinor: prepared.amountMinor,
    });
    return json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      receipt: prepared.reference,
      reused: false,
    });
  } catch {
    return error("Could not create a payment order.", 502, "RAZORPAY_ORDER_FAILED");
  }
}
