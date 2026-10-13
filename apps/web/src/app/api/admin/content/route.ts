import { z } from "zod";
import { can, currentStaff } from "@/lib/staff";
import { error, json, persistCatch, readJson } from "@/lib/http";
import { runLocked, saveFaqDraft, updateCms } from "@/lib/store";

const schema = z.object({
  heroTagline: z.string().max(160).optional(),
  heroBody: z.string().max(800).optional(),
  about: z.string().max(4000).optional(),
  farmStory: z.string().max(4000).optional(),
  contactPhone: z.string().max(40).optional(),
  contactEmail: z.string().email().or(z.literal("")).optional(),
  whatsapp: z.string().max(80).optional(),
  address: z.string().max(240).optional(),
  mapsUrl: z.string().max(300).optional(),
  supportHours: z.string().max(120).optional(),
  published: z.boolean().optional(),
  faqQ: z.string().max(200).optional(),
  faqA: z.string().max(2000).optional(),
  faqPublished: z.boolean().optional(),
});

export async function POST(req: Request) {
  const staff = await currentStaff();
  if (!staff) return error("Unauthorized.", 401);
  if (!can(staff.role, "content")) return error("Forbidden.", 403);
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const { faqQ, faqA, faqPublished, ...cmsPatch } = parsed.data;
  try {
    return json(
      await runLocked(() => {
        const cms = updateCms(cmsPatch, staff.email);
        const faqs = faqQ && faqA ? saveFaqDraft({ q: faqQ, a: faqA, published: Boolean(faqPublished) }, staff.email) : undefined;
        return { cms, faqs };
      }),
    );
  } catch (e) {
    return persistCatch(e, "Content could not be saved.");
  }
}
