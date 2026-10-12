import { z } from "zod";
import { email, error, json, phone, readJson } from "@/lib/http";
import { acceptQuote } from "@/lib/store";

const schema = z.object({ email, phone });

export async function POST(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const result = await acceptQuote(reference, parsed.data.email, parsed.data.phone);
  if (!result.ok) return error(result.error, 409);
  return json(result);
}
