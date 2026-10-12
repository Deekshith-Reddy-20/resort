import { error, json } from "@/lib/http";
import { db, lookupEnquiry } from "@/lib/store";

export async function GET(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";
  const phone = url.searchParams.get("phone") ?? "";
  const quote = db().quotes.find((q) => q.reference === reference);
  if (!quote) return error("Quote not found.", 404);
  const enquiry = db().events.find((e) => e.id === quote.enquiryId);
  if (!enquiry) return error("Quote not found.", 404);
  const verified = lookupEnquiry(enquiry.reference, email, phone);
  if (!verified) return error("Verification required.", 401);
  return json({ quote, enquiry: { reference: enquiry.reference, status: enquiry.status } });
}
