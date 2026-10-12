import { error, json } from "@/lib/http";
import { lookupEnquiry } from "@/lib/store";

export async function GET(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";
  const phone = url.searchParams.get("phone") ?? "";
  const found = lookupEnquiry(reference, email, phone);
  if (!found) return error("Enquiry not found.", 404);
  return json({
    reference: found.enquiry.reference,
    status: found.enquiry.status,
    eventType: found.enquiry.eventType,
    startDate: found.enquiry.startDate,
    endDate: found.enquiry.endDate,
    quote: found.quote
      ? {
          reference: found.quote.reference,
          status: found.quote.status,
          totalMinor: found.quote.totalMinor,
          dueNowMinor: found.quote.dueNowMinor,
          lineItems: found.quote.lineItems,
          expiresAt: found.quote.expiresAt,
        }
      : null,
    notice: "An enquiry is not a confirmed booking.",
  });
}
