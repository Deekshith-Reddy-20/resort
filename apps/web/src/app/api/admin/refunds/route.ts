import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, readJson } from "@/lib/http";
import { recordRefund, runLocked } from "@/lib/store";

const schema = z.object({
  paymentId: z.string(),
  amountMinor: z.number().int().positive(),
  reason: z.string().min(4).max(400),
});

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "refund")) return error("Forbidden.", 403);
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const result = await runLocked(() => recordRefund({ ...parsed.data, actor: staff.email }));
  if (!result.ok) return error(result.error, 400);
  return json(result);
}
