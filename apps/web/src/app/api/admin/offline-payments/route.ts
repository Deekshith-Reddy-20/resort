import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, persistCatch, readJson } from "@/lib/http";
import { recordOfflinePayment, runLocked } from "@/lib/store";

const schema = z.object({
  reference: z.string(),
  amountMinor: z.number().int().positive(),
  method: z.string().min(2).max(40),
  note: z.string().max(400),
});

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "refund")) return error("Forbidden.", 403);
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    const result = await runLocked(() => recordOfflinePayment({ ...parsed.data, actor: staff.email }));
    if (!result.ok) return error(result.error, 404);
    return json(result, 201);
  } catch (e) {
    return persistCatch(e, "Offline payment could not be recorded.");
  }
}
