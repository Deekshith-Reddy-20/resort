import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, persistCatch, readJson } from "@/lib/http";
import { runLocked, saveEventTemplate, saveNotificationTemplate } from "@/lib/store";

const schema = z.object({
  kind: z.enum(["event", "notification"]),
  name: z.string().min(2).max(80),
  notes: z.string().max(400).optional(),
  depositBps: z.number().int().min(0).max(10000).nullable().optional(),
  subject: z.string().max(160).optional(),
  body: z.string().max(2000).optional(),
  id: z.string().optional(),
});

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  try {
    if (parsed.data.kind === "event") {
      if (!can(staff.role, "pricing")) return error("Forbidden.", 403);
      return json(
        {
          template: await runLocked(() =>
            saveEventTemplate({ name: parsed.data.name, notes: parsed.data.notes ?? "", depositBps: parsed.data.depositBps ?? null }, staff.email),
          ),
        },
        201,
      );
    }
    if (!can(staff.role, "content") && !can(staff.role, "pricing")) return error("Forbidden.", 403);
    return json({
      template: await runLocked(() =>
        saveNotificationTemplate(
          { id: parsed.data.id, name: parsed.data.name, subject: parsed.data.subject ?? parsed.data.name, body: parsed.data.body ?? "" },
          staff.email,
        ),
      ),
    });
  } catch (e) {
    return persistCatch(e, "Template could not be saved.");
  }
}
