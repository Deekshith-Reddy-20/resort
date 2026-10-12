import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, readJson } from "@/lib/http";
import { updateSettings } from "@/lib/store";

const schema = z.object({
  bookingEnabled: z.boolean().optional(),
  ratesPublished: z.boolean().optional(),
  weekdayMinor: z.number().int().nonnegative().nullable().optional(),
  weekendMinor: z.number().int().nonnegative().nullable().optional(),
  taxBps: z.number().int().min(0).max(10000).nullable().optional(),
  depositBps: z.number().int().min(0).max(10000).nullable().optional(),
  maxGuests: z.number().int().positive().nullable().optional(),
  minNights: z.number().int().positive().nullable().optional(),
  maxNights: z.number().int().positive().nullable().optional(),
  holdMinutes: z.number().int().min(5).max(120).optional(),
});

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "pricing")) return error("Forbidden.", 403);
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  return json(updateSettings(parsed.data, staff.email));
}
