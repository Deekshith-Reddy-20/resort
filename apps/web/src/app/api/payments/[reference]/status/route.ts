import { error, json } from "@/lib/http";
import { db, runLockedRead } from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  return runLockedRead(() => {
  const payment = db().payments.find((p) => p.stayReference === reference || p.quoteReference === reference);
  const stay = db().stays.find((s) => s.reference === reference);
  const quote = db().quotes.find((q) => q.reference === reference);
  const enquiry = quote
    ? db().events.find((e) => e.id === quote.enquiryId)
    : db().events.find((e) => e.reference === reference);
  if (!payment && !stay && !quote && !enquiry) return error("Not found.", 404);
  return json({
    reference,
    kind: stay ? "stay" : quote || enquiry ? "event" : "unknown",
    paymentStatus: payment?.status ?? "none",
    reservationStatus: stay?.status ?? enquiry?.status ?? quote?.status ?? "unknown",
    exception: payment?.exceptionCode ?? null,
  });
  });
}
