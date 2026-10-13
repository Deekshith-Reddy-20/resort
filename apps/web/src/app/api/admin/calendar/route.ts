import { error, json } from "@/lib/http";
import { currentStaff } from "@/lib/staff";
import { propertyMonth } from "@/lib/store";

export async function GET(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  const url = new URL(req.url);
  const raw = url.searchParams.get("month") ?? "";
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();
  if (monthIndex < 0 || monthIndex > 11 || !Number.isFinite(year)) {
    return error("Month must be YYYY-MM.", 400);
  }
  return json(propertyMonth(year, monthIndex));
}
