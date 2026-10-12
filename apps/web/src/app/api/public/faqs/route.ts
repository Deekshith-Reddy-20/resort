import { json } from "@/lib/http";
import { publicFaqs } from "@/lib/store";

export async function GET() {
  return json({ faqs: publicFaqs() });
}
