import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, readJson } from "@/lib/http";
import { staffCancelStay } from "@/lib/store";

const schema = z.object({ reference: z.string() });

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "reservations")) return error("Forbidden.", 403);
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const result = staffCancelStay(parsed.data.reference, staff.email);
  if (!result.ok) return error(result.error, 409);
  return json(result);
}
