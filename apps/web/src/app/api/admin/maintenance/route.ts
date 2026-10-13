import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, isoDate, json, persistCatch, readJson } from "@/lib/http";
import { addMaintenance } from "@/lib/store";

const schema = z.object({
  startDate: isoDate,
  endDate: isoDate,
  reason: z.string().min(3).max(200),
});

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "ops") && staff.role !== "owner" && staff.role !== "admin") {
    return error("Forbidden.", 403);
  }
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const result = await addMaintenance(parsed.data.startDate, parsed.data.endDate, parsed.data.reason, staff.email);
    if (!result.ok) return error(result.error ?? "Conflict", 409);
    return json(result, 201);
  } catch (e) {
    return persistCatch(e, "Maintenance block could not be saved.");
  }
}
