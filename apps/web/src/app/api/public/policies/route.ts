import { json } from "@/lib/http";
import { publicPolicies } from "@/lib/store";

export async function GET() {
  return json(publicPolicies());
}
