"use client";

import { FormEvent, useEffect, useState } from "react";

type Overview = {
  stays: number;
  confirmedStays: number;
  enquiries: number;
  quotes: number;
  exceptions: number;
  bookingEnabled: boolean;
  calendar: { type: string; reference: string; status: string; start: string; end: string }[];
  exceptionsList: { id: string; code: string; detail: string }[];
  settings: Record<string, unknown>;
  staysList: { reference: string; status: string; checkIn: string; checkOut: string }[];
  eventsList: { reference: string; status: string; eventType: string; startDate: string; endDate: string }[];
  audit: { at: string; action: string; entity: string; entityId: string }[];
};

const modules = [
  "Overview",
  "Calendar",
  "Stays",
  "Events",
  "Quotes",
  "Pricing",
  "Maintenance",
  "Payments",
  "Content",
  "Rooms",
  "Gallery",
  "Policies",
  "Communications",
  "Staff",
  "Audit",
  "System",
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");

  async function load() {
    const res = await fetch("/api/admin/overview");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setAuthed(true);
    setOverview(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else load();
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-serif text-4xl">Staff sign-in</h1>
        <p className="mt-3 text-sm text-forest/70">
          No default production password exists. Configure STAFF_SESSION_SECRET, STAFF_DEV_EMAIL and STAFF_DEV_PASSWORD for
          local access, or connect Supabase Auth for staff accounts.
        </p>
        <form onSubmit={login} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="Staff email" className="w-full rounded-xl border px-3 py-2" />
          <input name="password" type="password" required minLength={8} placeholder="Password" className="w-full rounded-xl border px-3 py-2" />
          <button className="rounded-full bg-forest px-5 py-2 text-ivory">Sign in</button>
        </form>
        {error ? <p className="mt-4 text-dragon">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-4xl">Operations</h1>
        <button
          className="text-sm"
          onClick={async () => {
            await fetch("/api/admin/session", { method: "DELETE" });
            setAuthed(false);
          }}
        >
          Log out
        </button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {modules.map((m) => (
          <button key={m} onClick={() => setTab(m)} className={`rounded-full px-3 py-1 text-sm ${tab === m ? "bg-forest text-ivory" : "bg-white"}`}>
            {m}
          </button>
        ))}
      </div>
      <section className="mt-8 rounded-3xl bg-white p-6">
        {tab === "Overview" && overview ? (
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>Stays: {overview.stays}</div>
            <div>Confirmed: {overview.confirmedStays}</div>
            <div>Enquiries: {overview.enquiries}</div>
            <div>Exceptions: {overview.exceptions}</div>
            <div className="col-span-2">Online booking enabled: {String(overview.bookingEnabled)}</div>
          </dl>
        ) : null}
        {tab === "Calendar" && overview ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Type</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {overview.calendar.map((row) => (
                <tr key={row.reference + row.start}>
                  <td>{row.type}</td>
                  <td>{row.reference}</td>
                  <td>{row.status}</td>
                  <td>{row.start}</td>
                  <td>{row.end}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {tab === "Stays" && overview ? (
          <ul className="space-y-2 text-sm">
            {overview.staysList.map((s) => (
              <li key={s.reference}>
                {s.reference} · {s.status} · {s.checkIn} → {s.checkOut}
              </li>
            ))}
          </ul>
        ) : null}
        {tab === "Events" && overview ? (
          <div>
            <ul className="space-y-2 text-sm">
              {overview.eventsList.map((e) => (
                <li key={e.reference}>
                  {e.reference} · {e.status} · {e.eventType} · {e.startDate}
                </li>
              ))}
            </ul>
            <QuoteForm onDone={load} />
          </div>
        ) : null}
        {tab === "Pricing" ? <PricingForm onDone={load} /> : null}
        {tab === "Maintenance" ? <MaintenanceForm onDone={load} /> : null}
        {tab === "Payments" && overview ? (
          <ul className="text-sm">
            {overview.exceptionsList.map((ex) => (
              <li key={ex.id}>
                {ex.code}: {ex.detail}
              </li>
            ))}
            {overview.exceptionsList.length === 0 ? <li>No payment exceptions.</li> : null}
          </ul>
        ) : null}
        {tab === "Audit" && overview ? (
          <ul className="space-y-1 text-sm">
            {overview.audit.map((a, i) => (
              <li key={i}>
                {a.at} · {a.action} · {a.entity}:{a.entityId}
              </li>
            ))}
          </ul>
        ) : null}
        {tab === "Rooms" ? <RoomsForm onDone={load} /> : null}
        {["Quotes", "Content", "Gallery", "Policies", "Communications", "Staff", "System"].includes(tab) ? (
          <p className="text-sm text-forest/70">
            This module uses the same reservation service and content APIs. Editorial fields that are not owner-approved remain
            unpublished. Staff roles: owner/admin, reservations, operations, content. Refunds and price publishes require owner/admin.
          </p>
        ) : null}
      </section>
    </main>
  );
}

function QuoteForm({ onDone }: { onDone: () => void }) {
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enquiryReference: form.get("enquiryReference"),
        dueNowMinor: Number(form.get("dueNowMinor")),
        lineItems: [{ label: String(form.get("label")), amountMinor: Number(form.get("amountMinor")) }],
      }),
    });
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-2 border-t pt-4 text-sm md:grid-cols-4">
      <input name="enquiryReference" placeholder="Enquiry reference" className="rounded border px-2 py-1" required />
      <input name="label" placeholder="Line item" className="rounded border px-2 py-1" required />
      <input name="amountMinor" type="number" placeholder="Amount paise" className="rounded border px-2 py-1" required />
      <input name="dueNowMinor" type="number" placeholder="Due now paise" className="rounded border px-2 py-1" required />
      <button className="rounded bg-forest px-3 py-1 text-ivory">Issue quote</button>
    </form>
  );
}

function PricingForm({ onDone }: { onDone: () => void }) {
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ratesPublished: form.get("ratesPublished") === "on",
        bookingEnabled: form.get("bookingEnabled") === "on",
        weekdayMinor: form.get("weekdayMinor") ? Number(form.get("weekdayMinor")) : null,
        weekendMinor: form.get("weekendMinor") ? Number(form.get("weekendMinor")) : null,
        maxGuests: form.get("maxGuests") ? Number(form.get("maxGuests")) : null,
      }),
    });
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 text-sm md:grid-cols-2">
      <p className="col-span-full text-forest/70">Do not publish rates until the owner approves commercial terms.</p>
      <input name="weekdayMinor" type="number" placeholder="Weekday rate (paise)" className="rounded border px-2 py-1" />
      <input name="weekendMinor" type="number" placeholder="Weekend rate (paise)" className="rounded border px-2 py-1" />
      <input name="maxGuests" type="number" placeholder="Max overnight guests" className="rounded border px-2 py-1" />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="ratesPublished" /> Publish rates
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="bookingEnabled" /> Enable booking
      </label>
      <button className="rounded bg-forest px-3 py-1 text-ivory">Save</button>
    </form>
  );
}

function MaintenanceForm({ onDone }: { onDone: () => void }) {
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: form.get("startDate"),
        endDate: form.get("endDate"),
        reason: form.get("reason"),
      }),
    });
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-2 text-sm md:grid-cols-4">
      <input name="startDate" type="date" required className="rounded border px-2 py-1" />
      <input name="endDate" type="date" required className="rounded border px-2 py-1" />
      <input name="reason" required placeholder="Reason" className="rounded border px-2 py-1" />
      <button className="rounded bg-forest px-3 py-1 text-ivory">Close dates</button>
    </form>
  );
}

function RoomsForm({ onDone }: { onDone: () => void }) {
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: form.get("slug"),
        image: form.get("image") || null,
        photographPublished: form.get("photographPublished") === "on",
        publishedSummary: form.get("publishedSummary") || undefined,
      }),
    });
    onDone();
  }
  return (
    <div className="space-y-4 text-sm">
      <p>
        The resort video does not contain five distinct bedroom interiors. Confirm a photograph only when it is an
        owner-approved file already stored under <code>/images/</code>. Do not reuse aerials, the dining hall, or the terrace
        as a guest room.
      </p>
      <form onSubmit={onSubmit} className="grid gap-2 md:grid-cols-2">
        <select name="slug" required className="rounded border px-2 py-1">
          <option value="room-1">Room 1 · The Garden Retreat</option>
          <option value="room-2">Room 2 · The Modern Suite</option>
          <option value="room-3">Room 3 · The Nature Room</option>
          <option value="room-4">Room 4 · The Warm Luxe Room</option>
          <option value="room-5">Room 5 · The Signature Room</option>
        </select>
        <input name="image" placeholder="/images/rooms/room-1-approved.jpg" className="rounded border px-2 py-1" />
        <textarea name="publishedSummary" placeholder="Owner-approved description" className="rounded border px-2 py-1 md:col-span-2" />
        <label className="flex items-center gap-2">
          <input type="checkbox" name="photographPublished" /> Publish photograph
        </label>
        <button className="rounded bg-forest px-3 py-1 text-ivory">Save room media</button>
      </form>
    </div>
  );
}
