import { z } from "zod";
import { error, isoDate, json, readJson } from "@/lib/http";
import { createStayQuote } from "@/lib/store";

const schema = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.number().int().positive().max(200),
});

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const quote = await createStayQuote(parsed.data);
    return json(quote);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Quote failed.", 400);
  }
}
