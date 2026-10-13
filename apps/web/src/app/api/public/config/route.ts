import { json } from "@/lib/http";
import { publicConfig, runLockedRead } from "@/lib/store";

export async function GET() {
  const cfg = await runLockedRead(() => publicConfig());
  return json({
    ...cfg,
    razorpayKeyId: cfg.paymentsConfigured ? process.env.RAZORPAY_KEY_ID : null,
  });
}
