import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { BRAND, ROOMS } from "@/lib/content";
import { publicRooms } from "@/lib/store";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return ROOMS.map((room) => ({ slug: room.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const room = publicRooms().find((r) => r.slug === slug) ?? ROOMS.find((r) => r.slug === slug);
  return { title: room?.name ?? "Room" };
}

export default async function RoomDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = publicRooms().find((r) => r.slug === slug);
  if (!room) notFound();
  return (
    <main>
      <PageHero kicker="Included with every stay" title={`${room.name} · ${room.workingTitle}`} body={BRAND.roomNotice} />
      <section className="mx-auto max-w-4xl px-4 py-16">
        {room.photographPublished && room.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={room.image} alt={`${room.name} at V-Farms`} className="w-full rounded-3xl object-cover" />
        ) : (
          <div className="rounded-3xl bg-evergreen px-6 py-16 text-ivory">
            <p className="text-xs uppercase tracking-[0.25em] text-ivory/60">Photograph unpublished</p>
            <p className="mt-4 max-w-xl text-lg">
              No verified bedroom photograph is published for {room.name}. The V-Farms resort video shows the farm, guest
              building, dining hall, terrace, and courtyard — not five identifiable guest rooms.
            </p>
          </div>
        )}
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-dragon">Proposed working title</p>
        <h2 className="mt-1 font-serif text-4xl">{room.workingTitle}</h2>
        <p className="mt-2 text-sm text-forest/55">This name is a design direction. It is not an owner-approved room identity.</p>
        <p className="mt-6 text-forest/80">{room.summary}</p>
        <p className="mt-4 text-sm font-medium text-forest">There is no individual room price, calendar, or checkout.</p>
        <Link href="/stays" className="btn-primary mt-6">
          Book the entire estate
        </Link>
      </section>
    </main>
  );
}
