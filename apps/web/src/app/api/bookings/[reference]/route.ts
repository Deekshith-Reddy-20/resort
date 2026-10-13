import { error, json, persistCatch } from "@/lib/http";
import { lookupStay, publicStayByReference, runLockedRead } from "@/lib/store";

export async function GET(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const phone = url.searchParams.get("phone");
  try {
    return await runLockedRead(() => {
      if (email && phone) {
        const booking = lookupStay(reference, email, phone);
        if (!booking) return error("Booking not found.", 404);
        return json(booking);
      }
      const limited = publicStayByReference(reference);
      if (!limited) return error("Booking not found.", 404);
      return json(limited);
    });
  } catch (e) {
    return persistCatch(e, "Booking could not be loaded.");
  }
}
