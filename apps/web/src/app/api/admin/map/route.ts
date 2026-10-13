import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, readJson } from "@/lib/http";
import { updateMapZone } from "@/lib/store";

const schema = z.object({
  id: z.string(),
  label: z.string().max(80).optional(),
  detail: z.string().max(400).optional(),
  published: z.boolean().optional(),
});

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "content")) return error("Forbidden.", 403);
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const result = updateMapZone(parsed.data.id, parsed.data, staff.email);
  if (!result.ok) return error(result.error, 404);
  return json(result);
}
