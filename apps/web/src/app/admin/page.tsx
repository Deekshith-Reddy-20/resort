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
            <div className="col-span-2">Live stay booking: {String(overview.bookingEnabled)}</div>
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

function rupeeField(minor: number | null) {
  return minor == null ? "" : String(minor / 100);
}

function PricingForm({ onDone }: { onDone: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [gaps, setGaps] = useState<string[]>([]);
  const [live, setLive] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const d = data.draft ?? {};
        setLive(Boolean(data.live));
        setGaps(data.draftGaps ?? []);
        setDraft({
          weekday: rupeeField(d.weekdayMinor),
          weekend: rupeeField(d.weekendMinor),
          taxBps: d.taxBps == null ? "" : String(d.taxBps),
          depositBps: d.depositBps == null ? "" : String(d.depositBps),
          maxGuests: d.maxGuests == null ? "" : String(d.maxGuests),
          minNights: d.minNights == null ? "" : String(d.minNights),
          maxNights: d.maxNights == null ? "" : String(d.maxNights),
          checkInTime: d.checkInTime ?? "",
          checkOutTime: d.checkOutTime ?? "",
          cancellationSummary: d.cancellationSummary ?? "",
          holdMinutes: String(d.holdMinutes ?? 15),
          termsConfirmed: d.termsConfirmed ? "on" : "",
          privacyConfirmed: d.privacyConfirmed ? "on" : "",
          seasonal: JSON.stringify(d.seasonal ?? []),
        });
      })
      .catch(() => setNotice("Could not load stay settings."));
  }, []);

  async function send(action: "save-draft" | "publish" | "unpublish", e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    setNotice(null);
    const body: Record<string, unknown> = { action };
    if (action !== "unpublish") {
      const seasonalRaw = draft.seasonal?.trim();
      let seasonal: unknown[] = [];
      if (seasonalRaw) {
        try {
          const parsed = JSON.parse(seasonalRaw) as { startDate: string; endDate: string; nightlyInr?: number; nightlyMinor?: number }[];
          seasonal = parsed.map((row) => ({
            startDate: row.startDate,
            endDate: row.endDate,
            nightlyMinor: row.nightlyMinor ?? Math.round(Number(row.nightlyInr) * 100),
          }));
        } catch {
          setNotice("Seasonal rates must be JSON: [{startDate,endDate,nightlyInr}]");
          return;
        }
      }
      body.weekdayMinor = draft.weekday ? Math.round(Number(draft.weekday) * 100) : null;
      body.weekendMinor = draft.weekend ? Math.round(Number(draft.weekend) * 100) : null;
      body.taxBps = draft.taxBps === "" ? null : Number(draft.taxBps);
      body.depositBps = draft.depositBps === "" ? null : Number(draft.depositBps);
      body.maxGuests = draft.maxGuests === "" ? null : Number(draft.maxGuests);
      body.minNights = draft.minNights === "" ? null : Number(draft.minNights);
      body.maxNights = draft.maxNights === "" ? null : Number(draft.maxNights);
      body.checkInTime = draft.checkInTime || null;
      body.checkOutTime = draft.checkOutTime || null;
      body.cancellationSummary = draft.cancellationSummary || null;
      body.holdMinutes = Number(draft.holdMinutes || 15);
      body.termsConfirmed = draft.termsConfirmed === "on";
      body.privacyConfirmed = draft.privacyConfirmed === "on";
      body.seasonal = seasonal;
    }
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setGaps(data.missingSettings ?? data.draftGaps ?? []);
    setLive(Boolean(data.live));
    if (!res.ok) setNotice(data.error ?? "Could not save.");
    else setNotice(action === "publish" ? "Published. Live booking uses this snapshot until you unpublish or publish again." : action === "unpublish" ? "Live booking disabled. Draft is unchanged." : "Draft saved. Not live until you publish.");
    onDone();
  }

  return (
    <form onSubmit={(e) => send("save-draft", e)} className="grid gap-3 text-sm md:grid-cols-2">
      <p className="col-span-full text-forest/70">
        Save a draft, then publish. Live booking uses only the published snapshot. Amounts are whole-property INR per night, not
        per room.
      </p>
      <p className="col-span-full text-xs uppercase tracking-wide">{live ? "Live booking: on" : "Live booking: off"}</p>
      <label>
        Weekday nightly rate (INR)
        <input value={draft.weekday ?? ""} onChange={(e) => setDraft({ ...draft, weekday: e.target.value })} type="number" min={1} className="field" />
      </label>
      <label>
        Weekend nightly rate (INR)
        <input value={draft.weekend ?? ""} onChange={(e) => setDraft({ ...draft, weekend: e.target.value })} type="number" min={1} className="field" />
      </label>
      <label>
        Tax (basis points, 1800 = 18%)
        <input value={draft.taxBps ?? ""} onChange={(e) => setDraft({ ...draft, taxBps: e.target.value })} type="number" min={0} className="field" />
      </label>
      <label>
        Deposit (basis points, 10000 = 100%)
        <input value={draft.depositBps ?? ""} onChange={(e) => setDraft({ ...draft, depositBps: e.target.value })} type="number" min={0} className="field" />
      </label>
      <label>
        Max overnight guests
        <input value={draft.maxGuests ?? ""} onChange={(e) => setDraft({ ...draft, maxGuests: e.target.value })} type="number" min={1} className="field" />
      </label>
      <label>
        Min nights
        <input value={draft.minNights ?? ""} onChange={(e) => setDraft({ ...draft, minNights: e.target.value })} type="number" min={1} className="field" />
      </label>
      <label>
        Max nights
        <input value={draft.maxNights ?? ""} onChange={(e) => setDraft({ ...draft, maxNights: e.target.value })} type="number" min={1} className="field" />
      </label>
      <label>
        Hold minutes
        <input value={draft.holdMinutes ?? "15"} onChange={(e) => setDraft({ ...draft, holdMinutes: e.target.value })} type="number" min={5} max={120} className="field" />
      </label>
      <label>
        Check-in time
        <input value={draft.checkInTime ?? ""} onChange={(e) => setDraft({ ...draft, checkInTime: e.target.value })} type="time" className="field" />
      </label>
      <label>
        Check-out time
        <input value={draft.checkOutTime ?? ""} onChange={(e) => setDraft({ ...draft, checkOutTime: e.target.value })} type="time" className="field" />
      </label>
      <label className="col-span-full">
        Cancellation and refund policy
        <textarea value={draft.cancellationSummary ?? ""} onChange={(e) => setDraft({ ...draft, cancellationSummary: e.target.value })} rows={4} className="field" />
      </label>
      <label className="col-span-full">
        Seasonal rates JSON (optional)
        <textarea value={draft.seasonal ?? "[]"} onChange={(e) => setDraft({ ...draft, seasonal: e.target.value })} rows={3} className="field" />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={draft.termsConfirmed === "on"} onChange={(e) => setDraft({ ...draft, termsConfirmed: e.target.checked ? "on" : "" })} />
        Terms of stay apply at checkout
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={draft.privacyConfirmed === "on"} onChange={(e) => setDraft({ ...draft, privacyConfirmed: e.target.checked ? "on" : "" })} />
        Privacy policy applies at checkout
      </label>
      {gaps.length ? (
        <ul className="col-span-full list-disc pl-5 text-dragon">
          {gaps.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      ) : null}
      <div className="col-span-full flex flex-wrap gap-2">
        <button type="submit" className="rounded-full bg-forest px-4 py-2 text-ivory">
          Save draft
        </button>
        <button type="button" className="rounded-full bg-dragon px-4 py-2 text-white" onClick={() => send("publish")}>
          Publish live booking
        </button>
        <button type="button" className="rounded-full border px-4 py-2" onClick={() => send("unpublish")}>
          Unpublish
        </button>
      </div>
      {notice ? <p className="col-span-full">{notice}</p> : null}
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
