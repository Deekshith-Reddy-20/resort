import { z } from "zod";
import { error, json, readJson } from "@/lib/http";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/payments";
import { attachOrder, db } from "@/lib/store";

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
  let amountMinor = 0;
  let receipt = "";
  if (parsed.data.stayReference) {
    const stay = db().stays.find((s) => s.reference === parsed.data.stayReference);
    if (!stay) return error("Hold not found.", 404);
    const due = stay.priceSnapshot.dueNowMinor;
    if (typeof due !== "number") return error("This stay has no payable amount.", 409);
    amountMinor = due;
    receipt = stay.reference;
  } else if (parsed.data.quoteReference) {
    const quote = db().quotes.find((q) => q.reference === parsed.data.quoteReference);
    if (!quote || quote.status !== "accepted") return error("Quote must be accepted before payment.", 409);
    amountMinor = quote.dueNowMinor;
    receipt = quote.reference;
  }
  try {
    const order = await createRazorpayOrder({
      amountMinor,
      currency: "INR",
      receipt,
      notes: {
        stayReference: parsed.data.stayReference ?? "",
        quoteReference: parsed.data.quoteReference ?? "",
      },
    });
    await attachOrder({
      stayReference: parsed.data.stayReference,
      quoteReference: parsed.data.quoteReference,
      orderId: order.id,
      amountMinor,
    });
    return json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      receipt,
    });
  } catch {
    return error("Could not create a payment order.", 502, "RAZORPAY_ORDER_FAILED");
  }
}
