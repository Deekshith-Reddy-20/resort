import { json, persistCatch } from "@/lib/http";
import { publicFaqs, runLockedRead } from "@/lib/store";

export async function GET() {
  try {
    return json({ faqs: await runLockedRead(() => publicFaqs()) });
  } catch (e) {
    return persistCatch(e, "FAQs could not be loaded.");
  }
}
