import { z } from "zod";
import { error, isoDate, json, readJson } from "@/lib/http";
import { searchAvailability } from "@/lib/store";

const schema = z.object({
  product: z.enum(["stay", "event"]),
  startDate: isoDate,
  endDate: isoDate,
  guests: z.number().int().positive().max(200).optional(),
});

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const result = await searchAvailability(parsed.data);
    return json(result);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Search failed.", 400);
  }
}
