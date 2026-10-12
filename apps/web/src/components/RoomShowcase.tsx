import Link from "next/link";
import { BRAND, type RoomProfile } from "@/lib/content";

function RoomMedia({ room }: { room: RoomProfile }) {
  if (room.photographPublished && room.image) {
    return (
      <div className="aspect-[5/4] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={room.image}
          alt={`${room.name}, ${room.workingTitle}, at V-Farms`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
    );
  }
  return (
    <div className="flex aspect-[5/4] flex-col justify-between bg-evergreen p-5 text-ivory">
      <p className="font-serif text-5xl leading-none text-ivory/25">{room.name.replace("Room ", "0")}</p>
      <p className="text-[11px] uppercase tracking-[0.18em] text-ivory/70">Photograph unpublished</p>
    </div>
  );
}

export function RoomShowcase({ rooms }: { rooms: RoomProfile[] }) {
  return (
    <div>
      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        {BRAND.roomNotice} All five rooms are included in your eligible stay.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {rooms.map((room) => (
          <article key={room.slug} className="group card">
            <RoomMedia room={room} />
            <div className="p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{room.name}</p>
              <h3 className="mt-1 font-serif text-xl text-forest">{room.workingTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{room.publishedSummary ?? room.designDirection}</p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link href={`/rooms/${room.slug}`} className="text-forest underline-offset-4 hover:underline">
                  View Room
                </Link>
                <Link href="/stays" className="text-dragon underline-offset-4 hover:underline">
                  Book the entire estate
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
