import { z } from "zod";
import { email, error, json, phone, readJson } from "@/lib/http";
import { lookupQuote } from "@/lib/store";

const schema = z.object({ email, phone });

export async function POST(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const found = lookupQuote(reference, parsed.data.email, parsed.data.phone);
  if (!found) return error("Quote not found or verification failed.", 404);
  return json(found);
}
