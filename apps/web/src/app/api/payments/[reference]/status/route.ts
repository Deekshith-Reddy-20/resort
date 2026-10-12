import { error, json } from "@/lib/http";
import { db } from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  const payment = db().payments.find((p) => p.stayReference === reference || p.quoteReference === reference);
  const stay = db().stays.find((s) => s.reference === reference);
  const enquiry = db().events.find((e) => e.reference === reference);
  if (!payment && !stay && !enquiry) return error("Not found.", 404);
  return json({
    reference,
    paymentStatus: payment?.status ?? "none",
    reservationStatus: stay?.status ?? enquiry?.status ?? "unknown",
    exception: payment?.exceptionCode ?? null,
  });
}
