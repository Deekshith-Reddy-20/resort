import { json } from "@/lib/http";
import { publicProperty } from "@/lib/store";

export async function GET() {
  return json(publicProperty());
}
