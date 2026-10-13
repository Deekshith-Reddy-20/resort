import { json, persistCatch } from "@/lib/http";
import { publicPolicies, runLockedRead } from "@/lib/store";

export async function GET() {
  try {
    return json(await runLockedRead(() => publicPolicies()));
  } catch (e) {
    return persistCatch(e, "Policies could not be loaded.");
  }
}
