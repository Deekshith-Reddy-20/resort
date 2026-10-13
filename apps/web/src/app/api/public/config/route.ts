import { json } from "@/lib/http";
import { publicConfig, runLockedRead } from "@/lib/store";

export async function GET() {
  try {
    const cfg = await runLockedRead(() => publicConfig());
    return json({
      ...cfg,
      razorpayKeyId: cfg.paymentsConfigured ? process.env.RAZORPAY_KEY_ID : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Inventory store could not be loaded from the database.";
    return json({
      bookingEnabled: false,
      ratesPublished: false,
      paymentsConfigured: false,
      persistencyReady: false,
      persistency: "unavailable",
      missingSettings: [message, "Apply supabase/migrations including runtime_state, then retry."],
      timezone: "Asia/Kolkata",
      currency: "INR",
      razorpayKeyId: null,
    });
  }
}
