import { json } from "@/lib/http";
import { PersistError } from "@/lib/persist-error";
import { lastPersistFailure } from "@/lib/persist";
import { publicConfig, runLockedRead } from "@/lib/store";

export async function GET() {
  try {
    const cfg = await runLockedRead(() => publicConfig());
    return json({
      ...cfg,
      razorpayKeyId: cfg.paymentsConfigured ? process.env.RAZORPAY_KEY_ID : null,
    });
  } catch (e) {
    const failure = e instanceof PersistError ? e.failure : lastPersistFailure();
    const message = failure?.message ?? (e instanceof Error ? e.message : "Inventory store could not be loaded from the database.");
    return json(
      {
        bookingEnabled: false,
        ratesPublished: false,
        paymentsConfigured: false,
        persistencyReady: false,
        persistency: "unavailable",
        persistFailure: failure
          ? { operation: failure.operation, code: failure.code, reason: failure.reason }
          : { operation: "runtime_state.pull", code: null, reason: "unknown" },
        missingSettings: [message],
        maxGuests: null,
        timezone: "Asia/Kolkata",
        currency: "INR",
        razorpayKeyId: null,
      },
      503,
    );
  }
}
