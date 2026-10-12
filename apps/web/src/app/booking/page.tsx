"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/PageHero";

export default function BookingLookupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const reference = String(form.get("reference"));
    const email = String(form.get("email"));
    const phone = String(form.get("phone"));
    const res = await fetch(`/api/bookings/${encodeURIComponent(reference)}?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`);
    if (!res.ok) {
      setError("No matching reservation. Check the reference and contact details.");
      return;
    }
    router.push(`/booking/${encodeURIComponent(reference)}`);
  }

  return (
    <main>
      <PageHero title="Look up a reservation" body="Full guest details are shown only after email and phone verification." />
      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 px-4 py-16">
        <input name="reference" required placeholder="Reference" className="w-full rounded-xl border border-stone px-3 py-2" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border border-stone px-3 py-2" />
        <input name="phone" required placeholder="Phone" className="w-full rounded-xl border border-stone px-3 py-2" />
        <button className="rounded-full bg-forest px-5 py-2 text-ivory">Continue</button>
        {error ? <p className="text-dragon">{error}</p> : null}
      </form>
    </main>
  );
}
