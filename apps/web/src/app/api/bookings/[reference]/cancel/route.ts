import { z } from "zod";
import { email, error, json, phone, readJson } from "@/lib/http";
import { db, lookupStay, runLocked } from "@/lib/store";

const schema = z.object({ email, phone });

export async function POST(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  return runLocked(() => {
    const booking = lookupStay(reference, parsed.data.email, parsed.data.phone);
    if (!booking) return error("Booking not found.", 404);
    if (booking.status === "confirmed") {
      return error("Cancellation rules are not published. Contact the owner for a manual review.", 409);
    }
    const row = db().stays.find((s) => s.reference === reference);
    if (row) row.status = "cancelled";
    db().holds = db().holds.filter((h) => h.reference !== reference);
    return json({ reference, status: "cancelled" });
  });
}
