import { json } from "@/lib/http";
import { publicGallery } from "@/lib/store";
import { BRAND } from "@/lib/content";

export async function GET() {
  return json({ items: publicGallery(), note: BRAND.mediaNote });
}
