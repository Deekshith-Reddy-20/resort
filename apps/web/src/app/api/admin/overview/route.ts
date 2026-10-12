import { error, json } from "@/lib/http";
import { currentStaff } from "@/lib/staff";
import { adminOverview } from "@/lib/store";

export async function GET() {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  return json(adminOverview());
}
