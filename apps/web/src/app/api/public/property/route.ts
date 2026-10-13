import { json, persistCatch } from "@/lib/http";
import { publicProperty, runLockedRead } from "@/lib/store";

export async function GET() {
  try {
    return json(await runLockedRead(() => publicProperty()));
  } catch (e) {
    return persistCatch(e, "Property could not be loaded.");
  }
}
