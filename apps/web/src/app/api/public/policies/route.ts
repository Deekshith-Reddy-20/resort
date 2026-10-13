import { json } from "@/lib/http";
import { publicPolicies, runLockedRead } from "@/lib/store";

export async function GET() {
  return json(await runLockedRead(() => publicPolicies()));
}
