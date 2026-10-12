"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHero } from "@/components/PageHero";

export function EventsForm() {
  const params = useSearchParams();
  const [result, setResult] = useState<{ reference: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const defaultStart = params.get("startDate") ?? "";
  const defaultEnd = params.get("endDate") ?? "";
  const defaultType = params.get("eventType") ?? "";
  const defaultAttendees = params.get("attendees") ?? "";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const startDate = String(form.get("startDate"));
    const endDate = String(form.get("endDate"));
    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/events/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"),
        email: form.get("email"),
        phone: form.get("phone"),
        eventType: form.get("eventType"),
        startDate,
        endDate,
        expectedAttendees: form.get("expectedAttendees") ? Number(form.get("expectedAttendees")) : undefined,
        setupRequirements: form.get("setupRequirements") || undefined,
        vendorRequests: form.get("vendorRequests") || undefined,
        notes: form.get("notes") || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setError(data.error ?? "Could not submit.");
    else setResult(data);
  }

  return (
    <main>
      <PageHero
        kicker="Events"
        title="Host an exclusive gathering"
        body="Permitted event types and maximum attendance are not confirmed. Submitting this form does not book the estate or block other guests."
        image="/images/estate/vfarms_4k_hdr_style_12.jpg"
      />
      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.2fr]">
        <aside className="space-y-4 text-sm text-muted">
          <h2 className="font-serif text-3xl text-forest">How a private event is confirmed</h2>
          <ol className="space-y-3">
            <li>1. Enquiry — dates, gathering type, attendance, setup notes.</li>
            <li>2. Owner review — operations and calendar, not an automatic hold.</li>
            <li>3. Written quote — inclusions, amount, and expiry if the date is feasible.</li>
            <li>4. Accept and pay — a hold is taken only after acceptance; payment is verified on the server.</li>
          </ol>
          <p>Overnight room use, catering, décor, and vendors are not included unless an issued quote says so.</p>
        </aside>
        {result ? (
          <div className="rounded-3xl bg-white p-8" role="status">
            <h2 className="font-serif text-2xl text-forest">Enquiry received</h2>
            <p className="mt-3">{result.message}</p>
            <p className="mt-2 font-medium">Reference {result.reference}</p>
            <p className="mt-4 text-sm text-muted">Keep this reference. It is not a confirmed booking.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white p-6">
            <label className="block text-sm" htmlFor="event-type">
              Event type
              <input id="event-type" name="eventType" required placeholder="Describe the gathering" defaultValue={defaultType} className="field" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm" htmlFor="event-start">
                Start date
                <input id="event-start" name="startDate" type="date" required defaultValue={defaultStart} className="field" />
              </label>
              <label className="text-sm" htmlFor="event-end">
                End date
                <input id="event-end" name="endDate" type="date" required defaultValue={defaultEnd} className="field" />
              </label>
            </div>
            <label className="block text-sm" htmlFor="event-attendees">
              Expected attendance
              <input id="event-attendees" name="expectedAttendees" type="number" min={1} defaultValue={defaultAttendees} className="field" />
            </label>
            <label className="block text-sm" htmlFor="event-setup">
              Setup requirements
              <textarea id="event-setup" name="setupRequirements" rows={3} className="field" />
            </label>
            <label className="block text-sm" htmlFor="event-vendors">
              Vendor requests
              <textarea id="event-vendors" name="vendorRequests" rows={3} className="field" />
            </label>
            <label className="block text-sm" htmlFor="event-name">
              Organiser name
              <input id="event-name" name="fullName" required autoComplete="name" className="field" />
            </label>
            <label className="block text-sm" htmlFor="event-email">
              Email
              <input id="event-email" name="email" type="email" required autoComplete="email" className="field" />
            </label>
            <label className="block text-sm" htmlFor="event-phone">
              Phone
              <input id="event-phone" name="phone" required autoComplete="tel" className="field" />
            </label>
            <label className="block text-sm" htmlFor="event-notes">
              Notes
              <textarea id="event-notes" name="notes" rows={3} className="field" />
            </label>
            <button className="btn-primary disabled:opacity-60" disabled={loading}>
              {loading ? "Sending enquiry…" : "Submit enquiry"}
            </button>
            <div aria-live="polite">{error ? <p className="text-dragon">{error}</p> : null}</div>
          </form>
        )}
      </section>
    </main>
  );
}
