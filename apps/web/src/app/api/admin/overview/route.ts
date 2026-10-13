import { error, json } from "@/lib/http";
import { currentStaff } from "@/lib/staff";
import { adminOverview } from "@/lib/store";

export async function GET() {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  try {
    return json(adminOverview());
  } catch {
    return error("Operations data failed to load. Retry. If this persists after a server restart, the in-memory store needs a refresh.", 500);
  }
}
