import Link from "next/link";
import { BRAND, type RoomProfile } from "@/lib/content";

function RoomMedia({ room }: { room: RoomProfile }) {
  if (room.photographPublished && room.image) {
    return (
      <div className="aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={room.image}
          alt={`${room.name} at V-Farms`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
    );
  }
  return (
    <div className="flex aspect-[4/3] flex-col justify-between bg-gradient-to-br from-evergreen via-forest to-[#1a4d3a] p-5 text-ivory">
      <p className="font-serif text-5xl leading-none text-ivory/25">{room.name.replace("Room ", "0")}</p>
      <p className="text-[11px] uppercase tracking-[0.18em] text-ivory/70">Photograph unpublished</p>
    </div>
  );
}

export function RoomShowcase({ rooms }: { rooms: RoomProfile[] }) {
  return (
    <div>
      <p className="max-w-2xl text-sm leading-relaxed text-forest/70">
        {BRAND.roomNotice} Every eligible stay includes all five rooms, reserved together for your group.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {rooms.map((room) => (
          <article key={room.slug} className="group overflow-hidden rounded-2xl bg-white">
            <RoomMedia room={room} />
            <div className="p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-forest/50">{room.name}</p>
              <h3 className="mt-1 font-serif text-xl text-forest">{room.workingTitle}</h3>
              <p className="mt-1 text-[11px] text-forest/50">Proposed name · pending approval</p>
              <p className="mt-2 text-sm leading-relaxed text-forest/70">
                {room.publishedSummary ?? room.designDirection}
              </p>
              {!room.photographPublished ? (
                <p className="mt-2 text-xs text-forest/50">Interior not yet photographed in the estate film.</p>
              ) : null}
              <Link href={`/rooms/${room.slug}`} className="mt-3 inline-block text-sm text-dragon">
                View Room →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
