import Link from "next/link";
import { FaqAccordion } from "@/components/FaqAccordion";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { HeroVideo } from "@/components/HeroVideo";
import { RoomShowcase } from "@/components/RoomShowcase";
import { BRAND, GALLERY } from "@/lib/content";
import { publicRooms } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main>
      <HeroVideo />

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 md:px-6">
        {[
          ["Five-acre dragon fruit farm", "Nature, farming and open skies around a private estate."],
          ["Five beautiful rooms", "All included together in an eligible overnight stay."],
          ["Exclusive property", "Your group has the estate. Other guests are not booked alongside you."],
          ["Private events", "Celebrations and gatherings by owner-reviewed quotation."],
        ].map(([title, body]) => (
          <article key={title} className="border-t border-beige pt-4">
            <h2 className="font-medium text-forest">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-forest/65">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-dragon">Discover</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-forest md:text-5xl">A private escape, surrounded by nature.</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-charcoal/80">
              V-Farms is a private five-acre dragon fruit farm near Hyderabad. One guest building holds five rooms. Stays and
              events reserve the entire estate — never a single room.
            </p>
            <p className="mt-4 text-sm text-forest/60">What you see is filmed on the property. Exact coordinates remain unpublished.</p>
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-forest/80">
              <p><span className="block font-serif text-3xl text-forest">5</span> Acres</p>
              <p><span className="block font-serif text-3xl text-forest">5</span> Rooms, included</p>
              <p><span className="block font-serif text-3xl text-forest">1</span> Exclusive estate</p>
              <p><span className="block font-serif text-3xl text-forest">2</span> Ways to gather</p>
            </div>
            <Link href="/estate" className="btn-forest mt-8">
              Discover the Estate
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={GALLERY[0].src} alt={GALLERY[0].alt} className="col-span-2 row-span-2 h-full min-h-64 rounded-3xl object-cover md:min-h-[22rem]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={GALLERY[2].src} alt={GALLERY[2].alt} className="h-36 rounded-3xl object-cover md:h-44" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={GALLERY[4].src} alt={GALLERY[4].alt} className="h-36 rounded-3xl object-cover md:h-44" />
            <p className="col-span-3 text-xs text-forest/50">Aerial view · Guest building · Outdoor terrace — from the V-Farms film</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-dragon">Stay</p>
              <h2 className="mt-3 font-serif text-4xl text-forest md:text-5xl">Five distinct rooms. One exclusive estate.</h2>
            </div>
            <Link href="/rooms" className="text-sm text-dragon">
              View all room details →
            </Link>
          </div>
          <div className="mt-10">
            <RoomShowcase rooms={publicRooms()} />
          </div>
        </div>
      </section>

      <section className="bg-evergreen py-20 text-ivory">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-dragon">Experiences</p>
          <h2 className="mt-3 max-w-3xl font-serif text-4xl md:text-5xl">Nature, farming, and unhurried time together.</h2>
          <p className="mt-4 max-w-2xl text-ivory/75">
            These moments are visible in the estate film. Guided activities, meals, and add-ons will appear only after the
            owner confirms they are offered.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              [GALLERY[7], "Dragon fruit farm", "Cultivation rows and agricultural land surround the guest building."],
              [GALLERY[1], "Countryside quiet", "Open skies and neighbouring farmland, as filmed at dusk."],
              [GALLERY[4], "Outdoor gathering space", "A covered terrace on the property. Services here are not separately listed."],
            ].map(([img, title, body]) => (
              <article key={String(title)} className="overflow-hidden rounded-3xl bg-forest">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={(img as (typeof GALLERY)[number]).src} alt={(img as (typeof GALLERY)[number]).alt} className="h-48 w-full object-cover" loading="lazy" />
                <div className="p-5">
                  <h3 className="font-serif text-2xl">{title as string}</h3>
                  <p className="mt-2 text-sm text-ivory/75">{body as string}</p>
                </div>
              </article>
            ))}
          </div>
          <Link href="/experiences" className="btn-ghost mt-8">
            Discover experiences
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-dragon">Plan a stay</p>
            <h2 className="mt-3 font-serif text-4xl text-forest">An exclusive overnight reservation.</h2>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-charcoal/80">
              <li>The whole property is reserved for your group, including all five rooms.</li>
              <li>Individual rooms cannot be booked or priced separately.</li>
              <li>Overnight guest capacity is unpublished until the owner configures it.</li>
              <li>Nightly rates, taxes, and deposits appear only after they are published.</li>
              <li>Check-in and check-out times have not been decided.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href="/stays" className="btn-primary">
                Plan Your Stay
              </Link>
              <Link href="/cancellation-policy" className="text-forest/70">
                Cancellation policy
              </Link>
              <Link href="/terms" className="text-forest/70">
                Terms of stay
              </Link>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GALLERY[8].src} alt={GALLERY[8].alt} className="h-full min-h-64 rounded-3xl object-cover" loading="lazy" />
        </div>
      </section>

      <section className="overflow-hidden bg-[#123D2D] py-20 text-ivory">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-dragon">Events</p>
            <h2 className="mt-3 font-serif text-4xl md:text-5xl">Gather somewhere extraordinary.</h2>
            <p className="mt-4 text-ivory/80">
              Private gatherings occupy the entire estate. Permitted event types and attendance limits are not confirmed.
              Submit an enquiry; the owner may issue a dated quote. An enquiry is never a confirmed booking.
            </p>
            <Link href="/events" className="btn-primary mt-8">
              Request a Private Event Quote
            </Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GALLERY[11].src} alt={GALLERY[11].alt} className="min-h-64 rounded-3xl object-cover" loading="lazy" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-4xl text-forest">The farm, as filmed</h2>
            <p className="mt-2 max-w-2xl text-sm text-forest/55">{BRAND.mediaNote}</p>
          </div>
          <Link href="/gallery" className="text-sm text-dragon">
            Open the gallery
          </Link>
        </div>
        <GalleryLightbox items={GALLERY} preview={8} />
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-serif text-4xl text-forest">Questions travelers ask</h2>
          <div className="mt-8">
            <FaqAccordion limit={5} />
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/faq" className="text-dragon">
              All questions
            </Link>
            <Link href="/privacy" className="text-forest/70">
              Privacy
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="rounded-[2rem] bg-forest px-6 py-14 text-ivory md:px-12">
          <h2 className="font-serif text-4xl">Write to V-Farms</h2>
          <p className="mt-3 max-w-xl text-ivory/80">
            A public phone number and email have not been published. The contact form stores your message for the owner.
          </p>
          <Link href="/contact" className="btn-primary mt-6">
            Open the contact form
          </Link>
        </div>
      </section>
    </main>
  );
}
