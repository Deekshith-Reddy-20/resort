import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, isoDate, readJson } from "@/lib/http";
import { addOperationsNote } from "@/lib/store";

const schema = z.object({
  date: isoDate,
  kind: z.string().min(2).max(40),
  note: z.string().min(2).max(500),
});

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "ops")) return error("Forbidden.", 403);
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  return json({ note: addOperationsNote({ ...parsed.data, actor: staff.email }) }, 201);
}
