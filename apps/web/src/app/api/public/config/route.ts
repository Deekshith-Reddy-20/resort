import { json } from "@/lib/http";
import { publicConfig } from "@/lib/store";

export async function GET() {
  const cfg = publicConfig();
  return json({
    ...cfg,
    razorpayKeyId: cfg.paymentsConfigured ? process.env.RAZORPAY_KEY_ID : null,
  });
}
