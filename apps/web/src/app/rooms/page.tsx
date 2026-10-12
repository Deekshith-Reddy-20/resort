import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { RoomShowcase } from "@/components/RoomShowcase";
import { BRAND } from "@/lib/content";
import { pageMeta } from "@/lib/seo";
import { publicRooms } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = pageMeta(
  "Rooms",
  "Five distinct rooms at V-Farms. One exclusive estate booking. All five rooms are included in an eligible overnight stay.",
);

export default function RoomsPage() {
  return (
    <main>
      <PageHero
        kicker="Stay"
        title="Five distinct rooms"
        body={`${BRAND.roomNotice} All five rooms are included in your eligible stay. Photographs below are owner-supplied interiors. Individual rooms cannot be booked.`}
      />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <RoomShowcase rooms={publicRooms()} />
        <Link href="/stays" className="btn-primary mt-10">
          Book the entire estate
        </Link>
      </section>
    </main>
  );
}
