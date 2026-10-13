import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, readJson } from "@/lib/http";
import {
  commercialState,
  publishStayConfig,
  runLocked,
  runLockedRead,
  unpublishStayConfig,
  updateDraftSettings,
} from "@/lib/store";

const seasonal = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nightlyMinor: z.number().int().positive(),
});

const draftSchema = z.object({
  action: z.enum(["save-draft", "publish", "unpublish"]).default("save-draft"),
  weekdayMinor: z.number().int().nonnegative().nullable().optional(),
  weekendMinor: z.number().int().nonnegative().nullable().optional(),
  seasonal: z.array(seasonal).optional(),
  taxBps: z.number().int().min(0).max(10000).nullable().optional(),
  depositBps: z.number().int().min(0).max(10000).nullable().optional(),
  maxGuests: z.number().int().positive().nullable().optional(),
  minNights: z.number().int().positive().nullable().optional(),
  maxNights: z.number().int().positive().nullable().optional(),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  cancellationSummary: z.string().max(4000).nullable().optional(),
  termsConfirmed: z.boolean().optional(),
  privacyConfirmed: z.boolean().optional(),
  holdMinutes: z.number().int().min(5).max(120).optional(),
  minAdvanceDays: z.number().int().min(0).max(365).nullable().optional(),
  maxAdvanceDays: z.number().int().min(1).max(730).nullable().optional(),
  closedToArrival: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export async function GET() {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  return json(await runLockedRead(() => commercialState()));
}

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "pricing")) return error("Forbidden.", 403);
  const parsed = await readJson(req, draftSchema);
  if (!parsed.ok) return parsed.response;
  const { action, ...patch } = parsed.data;
  return runLocked(() => {
    if (action === "unpublish") {
      return json(unpublishStayConfig(staff.email));
    }
    updateDraftSettings(patch, staff.email);
    if (action === "publish") {
      const result = publishStayConfig(staff.email);
      if (!result.ok) return error(result.error, 422, "STAY_CONFIG_INCOMPLETE", { missingSettings: result.missingSettings });
      return json(result);
    }
    return json(commercialState());
  });
}
