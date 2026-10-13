import { json } from "@/lib/http";
import { publicProperty, runLockedRead } from "@/lib/store";

export async function GET() {
  return json(await runLockedRead(() => publicProperty()));
}
