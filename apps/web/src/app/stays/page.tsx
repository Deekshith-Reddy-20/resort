"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { StaySearch } from "@/components/StaySearch";
import { BRAND } from "@/lib/content";

function StayFlow() {
  const params = useSearchParams();
  const initialCheckIn = params.get("checkIn") ?? "";
  const initialCheckOut = params.get("checkOut") ?? "";
  const initialGuests = Number(params.get("guests") ?? 2);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const defaults = useMemo(
    () => ({ checkIn: initialCheckIn, checkOut: initialCheckOut, guests: initialGuests }),
    [initialCheckIn, initialCheckOut, initialGuests],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const checkIn = String(form.get("checkIn"));
    const checkOut = String(form.get("checkOut"));
    if (checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/bookings/holds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkIn,
        checkOut,
        guests: Number(form.get("guests")),
        fullName: form.get("fullName"),
        email: form.get("email"),
        phone: form.get("phone"),
        specialRequests: form.get("specialRequests") || undefined,
        acceptPolicies: form.get("acceptPolicies") === "on",
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create a hold.");
      return;
    }
    window.location.href = `/booking/${data.booking.reference}`;
  }

  return (
    <main>
      <PageHero
        kicker="Stays"
        title="Reserve the entire estate"
        body={`${BRAND.roomNotice} Online payment stays off until the owner publishes rates. A hold is not a confirmed booking.`}
        image="/images/estate/vfarms_4k_hdr_style_01.jpg"
      />
      <section className="mx-auto max-w-3xl space-y-8 px-4 py-16">
        <ol className="grid gap-3 text-sm md:grid-cols-3">
          <li className="rounded-2xl bg-white p-4">1. Check dates</li>
          <li className="rounded-2xl bg-white p-4">2. Guest details</li>
          <li className="rounded-2xl bg-white p-4">3. Pay after rates are published</li>
        </ol>
        <StaySearch />
        <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white p-6">
          <h2 className="font-serif text-2xl">Guest details</h2>
          <p className="text-sm text-forest/70">
            Availability and price are calculated on the server. If rates are unpublished, the hold request will explain why
            checkout cannot continue.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm" htmlFor="stay-in">
              Check-in
              <input id="stay-in" name="checkIn" type="date" required defaultValue={defaults.checkIn} className="field" />
            </label>
            <label className="text-sm" htmlFor="stay-out">
              Check-out
              <input id="stay-out" name="checkOut" type="date" required defaultValue={defaults.checkOut} className="field" />
            </label>
          </div>
          <label className="text-sm" htmlFor="stay-guests">
            Guests
            <input id="stay-guests" name="guests" type="number" min={1} required defaultValue={defaults.guests} className="field" />
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
              . Commercial amounts are not yet owner-approved.
            </span>
          </label>
          <button className="btn-forest disabled:opacity-60" disabled={loading}>
            {loading ? "Requesting hold…" : "Request reservation hold"}
          </button>
          <div aria-live="polite">{error ? <p className="text-dragon">{error}</p> : null}</div>
        </form>
      </section>
    </main>
  );
}

export default function StaysPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading stay form…</div>}>
      <StayFlow />
    </Suspense>
  );
}
