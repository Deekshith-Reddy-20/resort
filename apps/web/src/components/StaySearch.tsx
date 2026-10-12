"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Quote = {
  available: boolean;
  bookingEnabled: boolean;
  reason?: string;
  availabilityReason?: string;
  nights: number;
  totalMinor: number | null;
  dueNowMinor: number | null;
  lines: { label: string; amountMinor: number }[];
};

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function StaySearch({ embedded = false }: { embedded?: boolean }) {
  const min = useMemo(() => todayISO(), []);
  const [mode, setMode] = useState<"stay" | "event">("stay");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [eventType, setEventType] = useState("");
  const [attendees, setAttendees] = useState("");
  const [maxGuests, setMaxGuests] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/config")
      .then((r) => r.json())
      .then((cfg) => {
        if (typeof cfg.maxGuests === "number") setMaxGuests(cfg.maxGuests);
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setQuote(null);
    if (!checkIn || !checkOut) {
      setError("Choose start and end dates.");
      return;
    }
    if (mode === "stay" && checkOut <= checkIn) {
      setError("Check-out must be after check-in. Stays are overnight, whole-property reservations.");
      return;
    }
    if (mode === "event" && checkOut < checkIn) {
      setError("Event end date must be on or after the start date.");
      return;
    }
    if (mode === "stay" && guests < 1) {
      setError("Enter at least one guest.");
      return;
    }
    if (mode === "stay" && maxGuests != null && guests > maxGuests) {
      setError(`Guest count exceeds the configured overnight capacity of ${maxGuests}.`);
      return;
    }
    setLoading(true);
    try {
      if (mode === "event") {
        const res = await fetch("/api/availability/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: "event", startDate: checkIn, endDate: checkOut }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not check those dates.");
        setQuote({
          available: data.available,
          bookingEnabled: false,
          availabilityReason: data.reason,
          reason: data.available
            ? "An enquiry is not a booking. Continue to the event form so the owner can review and quote."
            : data.reason,
          nights: 0,
          totalMinor: null,
          dueNowMinor: null,
          lines: [],
        });
      } else {
        const res = await fetch("/api/pricing/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkIn, checkOut, guests }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not search dates.");
        setQuote(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={embedded ? "rounded-[1.75rem] bg-white p-4 text-charcoal shadow-2xl shadow-evergreen/25 md:p-5" : "rounded-3xl bg-white p-5 shadow-xl shadow-forest/5"}>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-ivory p-1 text-sm">
        <button
          type="button"
          className={`rounded-xl px-3 py-2 ${mode === "stay" ? "bg-white font-medium text-dragon shadow-sm" : "text-forest/60"}`}
          onClick={() => {
            setMode("stay");
            setQuote(null);
            setError(null);
          }}
        >
          Entire estate stay
        </button>
        <button
          type="button"
          className={`rounded-xl px-3 py-2 ${mode === "event" ? "bg-white font-medium text-forest shadow-sm" : "text-forest/60"}`}
          onClick={() => {
            setMode("event");
            setQuote(null);
            setError(null);
          }}
        >
          Exclusive event
        </button>
      </div>
      <p className="mb-3 text-xs text-forest/65">
        {mode === "stay"
          ? "Reserves the whole property, including all five rooms. Individual rooms are not sold."
          : "An enquiry is not a booking and does not hold the calendar."}
      </p>
      <form onSubmit={onSubmit} className={`grid gap-3 ${mode === "event" ? "md:grid-cols-2 lg:grid-cols-5" : "md:grid-cols-4"}`}>
        <label className="text-sm" htmlFor="search-checkin">
          {mode === "stay" ? "Check-in" : "Start date"}
          <input id="search-checkin" required type="date" min={min} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="field" />
        </label>
        <label className="text-sm" htmlFor="search-checkout">
          {mode === "stay" ? "Check-out" : "End date"}
          <input id="search-checkout" required type="date" min={checkIn || min} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="field" />
        </label>
        {mode === "stay" ? (
          <label className="text-sm" htmlFor="search-guests">
            Guests{maxGuests ? ` (max ${maxGuests})` : ""}
            <input
              id="search-guests"
              required
              type="number"
              min={1}
              max={maxGuests ?? 200}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="field"
            />
          </label>
        ) : (
          <label className="text-sm" htmlFor="search-type">
            Gathering type
            <input id="search-type" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g. family gathering" className="field" />
          </label>
        )}
        {mode === "event" ? (
          <label className="text-sm" htmlFor="search-attendees">
            Expected attendance
            <input id="search-attendees" type="number" min={1} value={attendees} onChange={(e) => setAttendees(e.target.value)} className="field" />
          </label>
        ) : null}
        <button type="submit" disabled={loading} className="btn-primary self-end w-full disabled:opacity-60">
          {loading ? "Checking…" : mode === "stay" ? "Check Availability" : "Request a Quote"}
        </button>
      </form>
      {mode === "stay" && maxGuests == null ? (
        <p className="mt-2 text-xs text-forest/55">Overnight guest capacity has not been configured by the owner.</p>
      ) : null}
      <div className="mt-3" aria-live="polite">
        {error ? <p className="text-sm text-dragon">{error}</p> : null}
        {quote ? (
          <div className="rounded-2xl border border-stone bg-ivory p-4 text-sm">
            <p className="font-medium text-forest">
              {quote.available ? (mode === "stay" ? "The estate is available for those dates." : "Those dates are currently free of confirmed stays, events, and closures.") : quote.availabilityReason ?? "Those dates are unavailable."}
            </p>
            {quote.totalMinor == null ? <p className="mt-2 text-forest/70">{quote.reason}</p> : (
              <ul className="mt-2 space-y-1">
                {quote.lines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-4">
                    <span>{line.label}</span>
                    <span>₹{(line.amountMinor / 100).toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            )}
            {quote.available && mode === "stay" ? (
              <Link href={`/stays?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`} className="btn-forest mt-4">
                Continue to guest details
              </Link>
            ) : null}
            {quote.available && mode === "event" ? (
              <Link
                href={`/events?startDate=${checkIn}&endDate=${checkOut}&eventType=${encodeURIComponent(eventType)}&attendees=${encodeURIComponent(attendees)}`}
                className="btn-forest mt-4"
              >
                Continue to event enquiry
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
