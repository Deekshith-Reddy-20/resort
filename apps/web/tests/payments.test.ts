import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyCheckoutSignature, verifyWebhookSignature } from "../src/lib/payments";

describe("Razorpay signatures", () => {
  it("P03 rejects an invalid checkout signature", () => {
    expect(
      verifyCheckoutSignature({
        orderId: "order_1",
        paymentId: "pay_1",
        signature: "deadbeef",
        secret: "test_secret",
      }),
    ).toBe(false);
  });

  it("accepts a valid checkout signature", () => {
    const secret = "test_secret";
    const orderId = "order_1";
    const paymentId = "pay_1";
    const signature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    expect(verifyCheckoutSignature({ orderId, paymentId, signature, secret })).toBe(true);
  });

  it("P04 webhook signature must match raw body", () => {
    const secret = "whsec";
    const raw = '{"event":"payment.captured"}';
    const signature = createHmac("sha256", secret).update(raw).digest("hex");
    expect(verifyWebhookSignature(raw, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(raw, "nope", secret)).toBe(false);
  });
});
