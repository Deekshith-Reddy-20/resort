import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { BRAND, GALLERY } from "@/lib/content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "The Estate",
  "A private five-acre dragon fruit farm near Hyderabad. One guest building, five rooms, and exclusive whole-property stays and events.",
);

export default function EstatePage() {
  return (
    <main>
      <PageHero kicker="The Estate" title="A private escape, surrounded by nature." body={BRAND.property} />
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="font-serif text-4xl text-forest">A private farm near Hyderabad</h2>
          <p className="mt-4 text-lg leading-relaxed text-charcoal/80">
            The estate is a five-acre dragon fruit farm with one guest building of five rooms. Stays and events reserve the
            entire property. Facilities not visible in the supplied footage are not listed here.
          </p>
          <p className="mt-4 text-sm text-forest/60">{BRAND.mediaNote}</p>
          <Link href="/stays" className="btn-forest mt-8">
            Plan a stay
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GALLERY[8].src} alt={GALLERY[8].alt} className="col-span-2 row-span-2 h-full min-h-64 rounded-3xl object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GALLERY[2].src} alt={GALLERY[2].alt} className="h-40 rounded-3xl object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GALLERY[7].src} alt={GALLERY[7].alt} className="h-40 rounded-3xl object-cover" />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <h2 className="font-serif text-3xl text-forest">What is confirmed</h2>
        <p className="mt-2 max-w-2xl text-sm text-forest/70">
          Exact coordinates, boundaries, parking, and pathways are pending owner confirmation. Labels below are a working
          schematic, not a surveyed map.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Arrival", "Check-in location and parking guidance will be published when confirmed."],
            ["Guest building", "One building. Five distinct rooms. Included together in a stay."],
            ["Plantation", "Dragon fruit cultivation areas shown in the resort video."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-stone bg-white p-5">
              <h3 className="font-medium text-forest">{title}</h3>
              <p className="mt-2 text-sm text-forest/70">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 pb-20 md:grid-cols-3 md:px-6">
        {GALLERY.slice(0, 6).map((item) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.src} src={item.src} alt={item.alt} className="h-48 w-full rounded-2xl object-cover" />
        ))}
      </section>
    </main>
  );
}
