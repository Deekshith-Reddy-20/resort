import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, readJson } from "@/lib/http";
import { issueQuote } from "@/lib/store";

const schema = z.object({
  enquiryReference: z.string(),
  lineItems: z.array(z.object({ label: z.string(), amountMinor: z.number().int() })).min(1),
  dueNowMinor: z.number().int().nonnegative(),
});

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "reservations") && staff.role !== "owner" && staff.role !== "admin") {
    return error("Forbidden.", 403);
  }
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const result = await issueQuote({ ...parsed.data, actor: staff.email });
  if (!result.ok) return error(result.error, 404);
  return json(result, 201);
}
