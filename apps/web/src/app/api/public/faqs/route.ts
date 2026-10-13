import { json } from "@/lib/http";
import { publicFaqs, runLockedRead } from "@/lib/store";

export async function GET() {
  return json({ faqs: await runLockedRead(() => publicFaqs()) });
}
