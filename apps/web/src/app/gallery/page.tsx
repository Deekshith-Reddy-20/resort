import type { Metadata } from "next";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { PageHero } from "@/components/PageHero";
import { BRAND, GALLERY } from "@/lib/content";

export const metadata: Metadata = { title: "Gallery" };

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
