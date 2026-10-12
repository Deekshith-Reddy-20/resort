import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { RoomShowcase } from "@/components/RoomShowcase";
import { BRAND } from "@/lib/content";
import { publicRooms } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Rooms" };

export default function RoomsPage() {
  return (
    <main>
      <PageHero
        kicker="Stay"
        title="Five distinct rooms"
        body={`${BRAND.roomNotice} Names below are working titles only. Bedroom photographs are unpublished until the owner approves them.`}
      />
      <section className="mx-auto max-w-7xl px-4 py-16">
        <RoomShowcase rooms={publicRooms()} />
        <Link href="/stays" className="btn-primary mt-10">
          Book the entire estate
        </Link>
      </section>
    </main>
  );
}
