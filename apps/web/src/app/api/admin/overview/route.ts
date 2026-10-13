import { error, json, persistCatch } from "@/lib/http";
import { currentStaff } from "@/lib/staff";
import { adminOverview, runLockedRead } from "@/lib/store";

export async function GET() {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  try {
    return json(await runLockedRead(() => adminOverview()));
  } catch (e) {
    return persistCatch(e, "Operations data failed to load.");
  }
}
