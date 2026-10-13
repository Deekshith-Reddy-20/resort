import { z } from "zod";
import { email, error, isoDate, json, persistCatch, personName, phone, readJson } from "@/lib/http";
import { createStayHold } from "@/lib/store";

const schema = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.number().int().positive().max(200),
  fullName: personName,
  email,
  phone,
  specialRequests: z.string().max(1000).optional(),
  acceptPolicies: z.literal(true),
});

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const result = await createStayHold(parsed.data);
    if (!result.ok) {
      return error(result.error, 409, "STAY_HOLD_BLOCKED", {
        missingSettings: "missingSettings" in result ? result.missingSettings : undefined,
      });
    }
    return json(result, 201);
  } catch (e) {
    return persistCatch(e, "Hold could not be created.");
  }
}
