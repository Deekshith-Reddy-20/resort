import { z } from "zod";
import { error, json, readJson } from "@/lib/http";
import { razorpayConfigured, verifyCheckoutSignature } from "@/lib/payments";
import { confirmVerifiedPayment } from "@/lib/store";

const schema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  if (!razorpayConfigured()) return error("Payments are not configured.", 503);
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return error("Payments are not configured.", 503);
  const ok = verifyCheckoutSignature({
    orderId: parsed.data.razorpay_order_id,
    paymentId: parsed.data.razorpay_payment_id,
    signature: parsed.data.razorpay_signature,
    secret,
  });
  if (!ok) return error("Invalid payment signature.", 400, "INVALID_SIGNATURE");
  const result = await confirmVerifiedPayment({
    orderId: parsed.data.razorpay_order_id,
    paymentId: parsed.data.razorpay_payment_id,
  });
  if (result.status === "unknown_order") return error("No matching payment order.", 404, "UNKNOWN_ORDER");
  return json(result);
}
