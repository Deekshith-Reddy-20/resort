"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/Alert";
import { PageHero } from "@/components/PageHero";
import { RoomShowcase } from "@/components/RoomShowcase";
import { StaySearch } from "@/components/StaySearch";
import { BRAND, ROOMS } from "@/lib/content";
import { readStayDraft, writeStayDraft } from "@/lib/search-draft";

type Quote = {
  available: boolean;
  bookingEnabled: boolean;
  reason?: string;
  availabilityReason?: string;
  blockCode?: string;
  blockMessage?: string | null;
  nights: number;
  totalMinor: number | null;
  dueNowMinor: number | null;
  taxMinor: number | null;
  lines: { label: string; amountMinor: number }[];
  missingSettings?: string[];
  checkInTime?: string | null;
  checkOutTime?: string | null;
};

function rupees(minor: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(minor / 100);
}

export function StayFlow() {
  const params = useSearchParams();
  const initialCheckIn = params.get("checkIn") ?? "";
  const initialCheckOut = params.get("checkOut") ?? "";
  const initialGuests = Number(params.get("guests") ?? 2);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(Number.isFinite(initialGuests) && initialGuests > 0 ? initialGuests : 2);

  useEffect(() => {
    const draft = readStayDraft();
    if (!params.get("checkIn") && draft.checkIn) setCheckIn(draft.checkIn);
    if (!params.get("checkOut") && draft.checkOut) setCheckOut(draft.checkOut);
    if (!params.get("guests") && typeof draft.guests === "number" && draft.guests > 0) setGuests(draft.guests);
    setDraftReady(true);
  }, [params]);

  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    if (!draftReady) return;
    writeStayDraft({ checkIn, checkOut, guests });
  }, [draftReady, checkIn, checkOut, guests]);

  useEffect(() => {
    if (!checkIn || !checkOut) return;
    if (checkOut <= checkIn) {
      setQuote(null);
      setError("Check-out must be after check-in.");
      return;
    }
    setError(null);
    setQuoteLoading(true);
    fetch("/api/pricing/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkIn, checkOut, guests }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not calculate a price.");
        setQuote(data);
        setMissing(data.missingSettings ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Quote failed."))
      .finally(() => setQuoteLoading(false));
  }, [checkIn, checkOut, guests]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch("/api/bookings/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn,
          checkOut,
          guests,
          fullName: form.get("fullName"),
          email: form.get("email"),
          phone: form.get("phone"),
          specialRequests: form.get("specialRequests") || undefined,
          acceptPolicies: form.get("acceptPolicies") === "on",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMissing(data.missingSettings ?? []);
        setError(data.error ?? "Could not create a hold.");
        return;
      }
      setSuccess(`Hold ${data.booking.reference} created.`);
      window.location.href = `/booking/${data.booking.reference}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;
    } catch {
      setError("The reservation service could not be reached. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const canHold = Boolean(quote?.bookingEnabled && quote.available && quote.totalMinor != null && !quoteLoading);

  function holdButtonLabel() {
    if (loading) return "Requesting hold…";
    if (quoteLoading) return "Checking availability…";
    if (checkIn && checkOut && checkOut <= checkIn) return "Choose a check-out after check-in";
    if (!quote) return "Select dates to continue";
    if (quote.blockCode === "persistence") {
      return quote.blockMessage ?? "Database persistence is not configured.";
    }
    if (quote.blockCode === "unpublished" || (quote.missingSettings && quote.missingSettings.length > 0)) {
      return quote.blockMessage ?? "Online stay booking is not published.";
    }
    if (quote.blockCode === "unavailable" || quote.availabilityReason) {
      if (!quote.available) return quote.blockMessage ?? quote.availabilityReason ?? "The property is unavailable for the selected dates.";
    }
    if (quote.blockCode === "capacity") return quote.blockMessage ?? "Guest count exceeds the configured capacity.";
    if (quote.blockCode === "stay_rules") return quote.blockMessage ?? quote.reason ?? "Stay rules prevent this reservation.";
    if (!canHold) return quote.blockMessage ?? quote.reason ?? "This stay cannot be held yet.";
    return "Request reservation hold";
  }

  return (
    <main>
      <PageHero
        kicker="Stays"
        title="Reserve the entire estate"
        body={`${BRAND.roomNotice} All five rooms are included in your eligible stay. Price and availability are calculated on the server from published owner settings.`}
        image="/images/estate/vfarms_4k_hdr_style_01.jpg"
      />
      <section className="mx-auto max-w-7xl space-y-12 px-4 py-16 md:px-6">
        <ol className="grid gap-3 text-sm md:grid-cols-4">
          {["Dates and guests", "Guest details", "Review price", "Hold, then pay"].map((step, i) => (
            <li key={step} className="rounded-2xl bg-white p-4">
              <span className="text-[11px] uppercase tracking-[0.16em] text-dragon">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-1 font-medium text-forest">{step}</p>
            </li>
          ))}
        </ol>
        <div>
          <h2 className="font-serif text-3xl text-forest md:text-4xl">Five distinct rooms. One exclusive estate.</h2>
          <div className="mt-6">
            <RoomShowcase rooms={[...ROOMS]} />
          </div>
        </div>
        <div className="mx-auto max-w-3xl space-y-8">
          <StaySearch />
          {quoteLoading ? <p className="text-sm text-muted">Calculating availability and price…</p> : null}
          {quote && missing.length > 0 ? (
            <Alert title="Owner settings still required">
              <p>Online booking stays disabled until these published settings exist. Staff can complete them in Operations → Pricing.</p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                {missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href="/admin" className="btn-forest mt-4">
                Open staff settings
              </Link>
            </Alert>
          ) : null}
          {quote?.totalMinor != null ? (
            <div className="rounded-3xl bg-white p-6">
              <h2 className="font-serif text-2xl">Review this stay</h2>
              <p className="mt-1 text-sm text-muted">
                Whole-property reservation · {checkIn} → {checkOut} · {guests} guest{guests === 1 ? "" : "s"} · {quote.nights}{" "}
                night{quote.nights === 1 ? "" : "s"}
              </p>
              {quote.checkInTime && quote.checkOutTime ? (
                <p className="mt-1 text-sm text-muted">
                  Check-in {quote.checkInTime} · Check-out {quote.checkOutTime}
                </p>
              ) : null}
              <ul className="mt-4 space-y-1 text-sm">
                {quote.lines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-4">
                    <span>{line.label}</span>
                    <span>{rupees(line.amountMinor)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-medium">Total {rupees(quote.totalMinor)}</p>
              {quote.dueNowMinor != null ? <p className="text-sm text-muted">Due to confirm {rupees(quote.dueNowMinor)}</p> : null}
              {!quote.available ? (
                <p className="mt-3 text-dragon">{quote.blockMessage ?? quote.availabilityReason ?? quote.reason}</p>
              ) : null}
            </div>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white p-6">
            <h2 className="font-serif text-2xl">Guest details</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm" htmlFor="stay-in">
                Check-in
                <input id="stay-in" name="checkIn" type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="field" />
              </label>
              <label className="text-sm" htmlFor="stay-out">
                Check-out
                <input id="stay-out" name="checkOut" type="date" required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="field" />
              </label>
            </div>
            <label className="text-sm" htmlFor="stay-guests">
              Guests
              <input id="stay-guests" name="guests" type="number" min={1} required value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="field" />
            </label>
            <label className="text-sm" htmlFor="stay-name">
              Full name
              <input id="stay-name" name="fullName" required autoComplete="name" className="field" />
            </label>
            <label className="text-sm" htmlFor="stay-email">
              Email
              <input id="stay-email" name="email" type="email" required autoComplete="email" className="field" />
            </label>
            <label className="text-sm" htmlFor="stay-phone">
              Phone
              <input id="stay-phone" name="phone" required autoComplete="tel" className="field" />
            </label>
            <label className="text-sm" htmlFor="stay-notes">
              Special requests
              <textarea id="stay-notes" name="specialRequests" rows={3} className="field" />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="acceptPolicies" required className="mt-1 h-4 w-4" />
              <span>
                I accept the{" "}
                <Link href="/terms" className="text-dragon">
                  terms of stay
                </Link>
                ,{" "}
                <Link href="/privacy" className="text-dragon">
                  privacy policy
                </Link>
                , and{" "}
                <Link href="/cancellation-policy" className="text-dragon">
                  cancellation policy
                </Link>
                .
              </span>
            </label>
            <button className="btn-forest disabled:opacity-60" disabled={loading || !canHold}>
              {holdButtonLabel()}
            </button>
            <div aria-live="polite">
              {error ? <p className="text-dragon">{error}</p> : null}
              {success ? <p className="text-forest">{success}</p> : null}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
