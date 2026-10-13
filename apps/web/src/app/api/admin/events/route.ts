import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, readJson } from "@/lib/http";
import { reviewEnquiry } from "@/lib/store";

const schema = z.object({
  reference: z.string(),
  action: z.enum(["review", "decline"]),
});

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "reservations")) return error("Forbidden.", 403);
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const result = reviewEnquiry(parsed.data.reference, parsed.data.action, staff.email);
  if (!result.ok) return error(result.error, 404);
  return json(result);
}
