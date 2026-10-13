"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileDock() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone bg-ivory/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
        <Link href="/events" className="btn border border-forest/20 text-forest">
          Plan an Event
        </Link>
        <Link href="/stays" className="btn-primary">
          Book Entire Resort
        </Link>
      </div>
    </div>
  );
}
