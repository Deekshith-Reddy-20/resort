import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { GALLERY } from "@/lib/content";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Experiences",
  "Time on a working dragon fruit farm near Hyderabad. Guided activities and meals are listed only after the owner confirms they are offered.",
);

export default function ExperiencesPage() {
  return (
    <main>
      <PageHero
        kicker="Experiences"
        title="Time on a working farm"
        body="The estate film shows plantation, countryside, terrace, and gathering spaces. Guided walks, tastings, meals, and paid add-ons are not listed until the owner confirms they are offered."
        image="/images/estate/vfarms_4k_hdr_style_07.jpg"
      />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
        <article>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GALLERY[0].src} alt={GALLERY[0].alt} className="h-72 w-full rounded-3xl object-cover" />
          <h2 className="mt-4 font-serif text-3xl">Dragon fruit plantation</h2>
          <p className="mt-2 text-forest/75">Rows of cultivation and neighbouring farmland are visible from the air.</p>
        </article>
        <article>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GALLERY[4].src} alt={GALLERY[4].alt} className="h-72 w-full rounded-3xl object-cover" />
          <h2 className="mt-4 font-serif text-3xl">Outdoor terrace</h2>
          <p className="mt-2 text-forest/75">A covered outdoor space on the property. No separate activity programme is published.</p>
        </article>
        <article>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GALLERY[3].src} alt={GALLERY[3].alt} className="h-72 w-full rounded-3xl object-cover" />
          <h2 className="mt-4 font-serif text-3xl">Time together</h2>
          <p className="mt-2 text-forest/75">An indoor gathering hall. Catering and restaurant service are not assumed.</p>
        </article>
        <article>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GALLERY[5].src} alt={GALLERY[5].alt} className="h-72 w-full rounded-3xl object-cover" />
          <h2 className="mt-4 font-serif text-3xl">Open courtyard</h2>
          <p className="mt-2 text-forest/75">Palm trees and open ground beside the guest building, as filmed.</p>
        </article>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <Link href="/stays" className="btn-primary">
          Plan a stay on the estate
        </Link>
      </section>
    </main>
  );
}
