import { z } from "zod";
import { email, isoDate, json, persistCatch, personName, phone, readJson } from "@/lib/http";
import { createEventEnquiry } from "@/lib/store";

const schema = z.object({
  fullName: personName,
  email,
  phone,
  eventType: z.string().min(2).max(80),
  startDate: isoDate,
  endDate: isoDate,
  expectedAttendees: z.number().int().positive().max(5000).optional(),
  setupRequirements: z.string().max(2000).optional(),
  vendorRequests: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const result = await createEventEnquiry(parsed.data);
    return json(result, 201);
  } catch (e) {
    return persistCatch(e, "Enquiry could not be stored.");
  }
}
