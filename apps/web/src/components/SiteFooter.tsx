import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-forest/20 bg-evergreen text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <p className="font-serif text-3xl">V-Farms</p>
          <p className="mt-2 text-sm text-ivory/75">A singular escape to nature</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ivory/70">
            A private five-acre dragon fruit farm near Hyderabad. Guests reserve the entire estate. All five rooms are
            included in an eligible overnight stay. Individual rooms are not sold.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/stays" className="btn-primary">
              Plan your stay
            </Link>
            <Link href="/events" className="btn-ghost">
              Host an event
            </Link>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ivory/55">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-ivory/80">
            <li>
              <Link href="/estate">The estate</Link>
            </li>
            <li>
              <Link href="/rooms">Five rooms</Link>
            </li>
            <li>
              <Link href="/gallery">Gallery</Link>
            </li>
            <li>
              <Link href="/experiences">Experiences</Link>
            </li>
            <li>
              <Link href="/about">About</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ivory/55">Policies</p>
          <ul className="mt-3 space-y-2 text-sm text-ivory/80">
            <li>
              <Link href="/terms">Terms of stay</Link>
            </li>
            <li>
              <Link href="/event-terms">Event terms</Link>
            </li>
            <li>
              <Link href="/cancellation-policy">Cancellation</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/faq">FAQ</Link>
            </li>
            <li>
              <Link href="/booking">Look up a reservation</Link>
            </li>
          </ul>
          <p className="mt-6 text-xs text-ivory/50">Near Hyderabad, Telangana. Exact address pending owner confirmation.</p>
          <p className="mt-2 text-xs text-ivory/40">© {new Date().getFullYear()} V-Farms. Exclusive whole-property stays.</p>
        </div>
      </div>
    </footer>
  );
}
