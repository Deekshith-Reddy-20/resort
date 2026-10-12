import { GalleryLightbox } from "@/components/GalleryLightbox";
import { PageHero } from "@/components/PageHero";
import { BRAND, GALLERY } from "@/lib/content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Gallery",
  "Photographs of V-Farms taken from the estate film. Stills were upscaled for presentation and are not native 4K or genuine HDR.",
);

export default function GalleryPage() {
  return (
    <main>
      <PageHero kicker="Gallery" title="The farm, as filmed" body={BRAND.mediaNote} />
      <section className="mx-auto max-w-6xl px-4 py-16">
        <GalleryLightbox items={GALLERY} />
      </section>
    </main>
  );
}
