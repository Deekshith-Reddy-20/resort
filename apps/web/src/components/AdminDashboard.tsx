"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PropertyCalendar } from "@/components/PropertyCalendar";
import { Skeleton } from "@/components/Alert";

type Overview = {
  today: string;
  timezone: string;
  arrivalsToday: number;
  departuresToday: number;
  activeStays: number;
  upcomingEvents: number;
  pendingEnquiries: number;
  quotesAwaiting: number;
  activeHolds: number;
  pendingPayments: number;
  exceptions: number;
  closures?: number;
  outstandingMinor?: number;
  bookingEnabled: boolean;
  calendar: { type: string; reference: string; status: string; start: string; end: string }[];
  exceptionsList: { id: string; code: string; detail: string }[];
  staysList: {
    reference: string;
    status: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    createdAt?: string;
    guestName?: string;
    email?: string;
    phone?: string;
    totalMinor?: number;
    paidMinor?: number;
    outstandingMinor?: number;
    paymentStatus?: string;
    type?: string;
    policySnapshot?: Record<string, unknown>;
    priceSnapshot?: Record<string, unknown>;
    specialRequests?: string;
  }[];
  eventsList: {
    reference: string;
    status: string;
    eventType: string;
    startDate: string;
    endDate: string;
    expectedAttendees?: number;
    setupRequirements?: string;
    vendorRequests?: string;
    notes?: string;
    guestName?: string;
    quoteReference?: string | null;
    quoteStatus?: string | null;
    dueNowMinor?: number | null;
  }[];
  reports?: { stayNights: number; confirmedStays: number; confirmedEvents: number; capturedRevenueMinor: number };
  offlinePayments?: { id: string; reference: string; amountMinor: number; method: string; note: string }[];
  eventTemplates?: { id: string; name: string; notes: string; depositBps: number | null }[];
  notificationTemplates?: { id: string; name: string; subject: string; body: string }[];
  faqDrafts?: { q: string; a: string; published: boolean }[];
  quotesList: { reference: string; status: string; totalMinor: number; dueNowMinor: number }[];
  payments: { id: string; orderId?: string; status: string; amountMinor: number; stayReference?: string }[];
  refunds: { id: string; amountMinor: number; reason: string }[];
  audit: { at: string; action: string; entity: string; entityId: string }[];
  cms: Record<string, string | boolean>;
  notifications: { id: string; type: string; to: string; status: string; error?: string; subject: string }[];
  operationsNotes: { id: string; date: string; kind: string; note: string }[];
  mapZones: { id: string; label: string; detail: string; published: boolean }[];
  contactsList: { id: string; name: string; email: string; message: string }[];
  integrations: Record<string, string | boolean>;
};

const ALL_MODULES = [
  "Overview",
  "Calendar",
  "Stays",
  "Events",
  "Pricing",
  "Operations",
  "Payments",
  "Content",
  "Settings",
  "Audit",
] as const;

function modulesFor(role: string | null) {
  if (!role) return [];
  if (role === "owner" || role === "admin") return [...ALL_MODULES];
  if (role === "reservations") return ["Overview", "Calendar", "Stays", "Events"];
  if (role === "operations") return ["Overview", "Calendar", "Operations"];
  if (role === "content") return ["Content"];
  return ["Overview"];
}

export function AdminDashboard({ onLogout, onUnauthorized }: { onLogout: () => void; onUnauthorized?: () => void }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");
  const [filter, setFilter] = useState("all");
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [stayQuery, setStayQuery] = useState("");
  const [stayStatus, setStayStatus] = useState("all");
  const [role, setRole] = useState<string | null>(null);
  const [selectedStay, setSelectedStay] = useState<Overview["staysList"][number] | null>(null);
  const modules = modulesFor(role);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview");
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onUnauthorized?.();
        setPhase("error");
        setError("Session expired. Sign in again.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Operations data could not be loaded.");
        setPhase("error");
        return;
      }
      setOverview(data);
      setError(null);
      setPhase("ready");
    } catch {
      setError("The operations service could not be reached.");
      setPhase("error");
    }
  }, [onUnauthorized]);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((s) => {
        setRole(typeof s.role === "string" && s.role ? s.role : "unknown");
      })
      .catch(() => setRole("unknown"));
    load();
    const tick = () => {
      if (document.visibilityState === "visible") load();
    };
    const id = window.setInterval(tick, 8000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  useEffect(() => {
    if (!modules.includes(tab as (typeof ALL_MODULES)[number])) setTab(modules[0] ?? "Overview");
  }, [modules, tab]);

  const stays = useMemo(() => {
    const rows = overview?.staysList ?? [];
    return rows.filter((s) => {
      const q = stayQuery.trim().toLowerCase();
      const hit =
        !q ||
        s.reference.toLowerCase().includes(q) ||
        (s.guestName ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q);
      return hit && (stayStatus === "all" || s.status === stayStatus);
    });
  }, [overview, stayQuery, stayStatus]);

  if (phase === "loading" && !overview) {
    return (
      <div className="space-y-4" aria-busy="true">
        <p className="sr-only">Loading operations dashboard</p>
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 md:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (phase === "error" && !overview) {
    return (
      <div className="rounded-3xl bg-white p-6" role="alert">
        <h1 className="font-serif text-3xl text-forest">Operations unavailable</h1>
        <p className="mt-3 text-sm text-dragon">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
      <aside className="mb-6 lg:mb-0">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl text-forest">Operations</h1>
          <button type="button" className="text-sm text-forest underline" onClick={load}>
            Refresh
          </button>
          <button className="text-sm text-muted lg:hidden" onClick={onLogout}>
            Log out
          </button>
        </div>
        <nav className="-mx-1 mt-4 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible" aria-label="Admin modules">
          {modules.map((m) => (
            <button
              key={m}
              onClick={() => setTab(m)}
              className={`shrink-0 rounded-full px-3 py-2 text-left text-sm ${tab === m ? "bg-forest text-ivory" : "bg-white text-forest"}`}
            >
              {m}
            </button>
          ))}
        </nav>
        <button className="mt-4 hidden text-sm text-muted lg:inline" onClick={onLogout}>
          Log out
        </button>
      </aside>
      <section className="rounded-3xl bg-white p-4 md:p-6">
        {error ? <p className="mb-4 text-dragon">{error}</p> : null}
        {tab === "Overview" ? (
          <>
            {String(overview.integrations.persistency ?? "").includes("memory") ? (
              <p className="mb-4 rounded-2xl bg-ivory p-3 text-sm text-forest" role="status">
                Inventory is in-process memory. On Vercel each serverless instance has its own store, so stays, holds, and
                calendar rows do not persist across requests. Apply the Supabase migrations and set DATABASE_MODE=supabase
                before treating preview bookings as real.
              </p>
            ) : null}
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            {[
              ["Today (IST)", overview.today],
              ["Arrivals", overview.arrivalsToday],
              ["Departures", overview.departuresToday],
              ["Active stays", overview.activeStays],
              ["Upcoming events", overview.upcomingEvents],
              ["Pending enquiries", overview.pendingEnquiries],
              ["Quotes awaiting", overview.quotesAwaiting],
              ["Active holds", overview.activeHolds],
              ["Pending payments", overview.pendingPayments],
              ["Exceptions", overview.exceptions],
              ["Closures", overview.closures ?? 0],
              ["Outstanding", `₹${((overview.outstandingMinor ?? 0) / 100).toLocaleString("en-IN")}`],
              ["Live stay booking", String(overview.bookingEnabled)],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-2xl bg-ivory p-3">
                <dt className="text-muted">{k}</dt>
                <dd className="mt-1 font-medium text-forest">{v}</dd>
              </div>
            ))}
          </dl>
          </>
        ) : null}
        {tab === "Calendar" ? (
          <div>
            <PropertyCalendar onRefresh={load} />
            <div className="mt-8">
              <div className="mb-3 flex flex-wrap gap-2 text-sm">
                {["all", "stay", "event", "event_soft", "hold", "maintenance"].map((f) => (
                  <button key={f} className={`rounded-full px-3 py-1 ${filter === f ? "bg-forest text-ivory" : "bg-ivory"}`} onClick={() => setFilter(f)}>
                    {f}
                  </button>
                ))}
              </div>
              <p className="mb-3 text-xs text-muted">Agenda of inventory records. event_soft does not occupy dates.</p>
              {overview.calendar.filter((row) => filter === "all" || row.type === filter).length === 0 ? (
                <p className="text-sm text-muted">No calendar records yet. New confirmed stays, holds, events, and closures appear here automatically.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[36rem] w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted">
                        <th>Type</th>
                        <th>Reference</th>
                        <th>Status</th>
                        <th>Start</th>
                        <th>End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.calendar
                        .filter((row) => filter === "all" || row.type === filter)
                        .map((row) => (
                          <tr key={row.reference + row.start + row.type}>
                            <td>{row.type}</td>
                            <td>{row.reference}</td>
                            <td>{row.status}</td>
                            <td>{row.start}</td>
                            <td>{row.end}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
        {tab === "Stays" ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 md:grid-cols-3">
              <input value={stayQuery} onChange={(e) => setStayQuery(e.target.value)} placeholder="Search reference or guest" className="field" />
              <select value={stayStatus} onChange={(e) => setStayStatus(e.target.value)} className="field">
                <option value="all">All statuses</option>
                <option value="held">Held</option>
                <option value="awaiting_payment">Awaiting payment</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
              <button type="button" className="btn-secondary" onClick={load}>
                Refresh stays
              </button>
            </div>
            {stays.length === 0 ? <p className="text-muted">No stay reservations match. Empty inventory is shown as zero, not sample data.</p> : null}
            <div className="overflow-x-auto">
              <table className="min-w-[52rem] w-full text-left">
                <thead>
                  <tr className="text-muted">
                    <th>Reference</th>
                    <th>Guest</th>
                    <th>Dates</th>
                    <th>Guests</th>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stays.map((s) => (
                    <tr key={s.reference} className="border-t border-stone">
                      <td className="py-2">{s.reference}</td>
                      <td>
                        {s.guestName}
                        <span className="block text-xs text-muted">{s.email}</span>
                      </td>
                      <td>
                        {s.checkIn} → {s.checkOut}
                      </td>
                      <td>{s.guests}</td>
                      <td>{s.type ?? "whole-property stay"}</td>
                      <td>₹{((s.totalMinor ?? 0) / 100).toLocaleString("en-IN")}</td>
                      <td>₹{((s.paidMinor ?? 0) / 100).toLocaleString("en-IN")}</td>
                      <td>₹{((s.outstandingMinor ?? 0) / 100).toLocaleString("en-IN")}</td>
                      <td>{s.paymentStatus}</td>
                      <td>{s.status}</td>
                      <td>
                        <button type="button" className="text-dragon underline" onClick={() => setSelectedStay(s)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedStay ? (
              <aside className="rounded-2xl bg-ivory p-4">
                <h3 className="font-serif text-2xl text-forest">{selectedStay.reference}</h3>
                <p className="mt-2">{selectedStay.guestName} · {selectedStay.email} · {selectedStay.phone}</p>
                <p className="mt-1">{selectedStay.checkIn} → {selectedStay.checkOut} · {selectedStay.guests} guests · whole-property stay</p>
                <p className="mt-1">Total ₹{((selectedStay.totalMinor ?? 0) / 100).toLocaleString("en-IN")} · Paid ₹{((selectedStay.paidMinor ?? 0) / 100).toLocaleString("en-IN")} · Balance ₹{((selectedStay.outstandingMinor ?? 0) / 100).toLocaleString("en-IN")}</p>
                <p className="mt-1">Payment {selectedStay.paymentStatus} · Status {selectedStay.status}</p>
                {selectedStay.specialRequests ? <p className="mt-2">Requests: {selectedStay.specialRequests}</p> : null}
                <pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify(selectedStay.policySnapshot ?? {}, null, 2)}</pre>
                {selectedStay.status !== "confirmed" ? (
                  <button
                    type="button"
                    className="btn-secondary mt-3"
                    onClick={async () => {
                      await fetch("/api/admin/stays/cancel", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reference: selectedStay.reference }),
                      });
                      setSelectedStay(null);
                      load();
                    }}
                  >
                    Cancel unconfirmed hold
                  </button>
                ) : (
                  <p className="mt-3 text-muted">Confirmed stays need an owner refund review. Inventory is not released from this button.</p>
                )}
              </aside>
            ) : null}
          </div>
        ) : null}
        {tab === "Events" ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted">Pipeline: Enquiry → Review → Quote sent → Accepted → Hold/deposit → Confirmed. Enquiries do not block the calendar.</p>
            <EventsDesk events={overview.eventsList} onDone={load} />
            <h3 className="font-serif text-2xl text-forest">Quotes</h3>
            {overview.quotesList.length === 0 ? <p className="text-muted">No quotations issued.</p> : null}
            <ul className="space-y-2">
              {overview.quotesList.map((q) => (
                <li key={q.reference}>
                  {q.reference} · {q.status} · ₹{(q.totalMinor / 100).toLocaleString("en-IN")} deposit ₹{(q.dueNowMinor / 100).toLocaleString("en-IN")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {tab === "Pricing" ? (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl text-forest">Stay pricing</h2>
            <p className="text-sm text-muted">
              Owner or admin only. Save a complete whole-property draft, then Publish. The public /stays page uses the published snapshot. Leave checkout unpublished until rates, tax, deposit, capacity, nights, times, cancellation text, and policy confirmations are the owner&apos;s real values.
            </p>
            <PricingForm onDone={load} />
            <h3 className="font-serif text-2xl text-forest">Event packages</h3>
            <p className="text-sm text-muted">Templates store intended event types and deposit basis. They are not live prices until a quote is issued.</p>
            <ul className="space-y-2 text-sm">
              {(overview.eventTemplates ?? []).map((t) => (
                <li key={t.id}>
                  {t.name} · deposit {t.depositBps == null ? "unset" : `${t.depositBps} bps`} · {t.notes}
                </li>
              ))}
            </ul>
            <TemplateForm kind="event" onDone={load} />
          </div>
        ) : null}
        {tab === "Operations" ? (
          <div className="space-y-8">
            <div>
              <h3 className="font-serif text-2xl text-forest">Daily tasks</h3>
              <p className="mb-3 text-sm text-muted">Check-in/out, turnover, event setup, and vendor notes. These do not change inventory.</p>
              <OpsForm notes={overview.operationsNotes} onDone={load} />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-forest">Maintenance closures</h3>
              <p className="mb-3 text-sm text-muted">Closed dates occupy the whole estate and appear on the master calendar.</p>
              <MaintenanceForm onDone={load} />
            </div>
          </div>
        ) : null}
        {tab === "Payments" ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted">Gateway rows, outstanding stay balances, offline logs, and refund exceptions. Refunds and offline capture stay owner/admin only.</p>
            <ul>
              {overview.payments.map((p) => (
                <li key={p.id}>
                  {p.orderId ?? p.id} · {p.status} · ₹{(p.amountMinor / 100).toLocaleString("en-IN")} {p.stayReference ?? ""}
                </li>
              ))}
            </ul>
            <h3 className="font-serif text-2xl text-forest">Offline logs</h3>
            {(overview.offlinePayments ?? []).length === 0 ? <p className="text-muted">No cash or transfer logs.</p> : null}
            <ul>
              {(overview.offlinePayments ?? []).map((p) => (
                <li key={p.id}>
                  {p.reference} · {p.method} · ₹{(p.amountMinor / 100).toLocaleString("en-IN")} · {p.note}
                </li>
              ))}
            </ul>
            {role === "owner" || role === "admin" ? <OfflinePayForm onDone={load} /> : <p className="text-muted">Offline payment entry is restricted.</p>}
            <ul>
              {overview.exceptionsList.map((ex) => (
                <li key={ex.id} className="text-dragon">
                  {ex.code}: {ex.detail}
                </li>
              ))}
            </ul>
            {role === "owner" || role === "admin" ? <RefundForm onDone={load} /> : <p className="text-muted">Refund rights are restricted to authorized roles.</p>}
          </div>
        ) : null}
        {tab === "Content" ? (
          <div className="space-y-8">
            <ContentForm cms={overview.cms} onDone={load} />
            <h3 className="font-serif text-2xl text-forest">Room photographs</h3>
            <RoomsForm onDone={load} />
            <h3 className="font-serif text-2xl text-forest">Estate map hotspots</h3>
            <MapForm zones={overview.mapZones} onDone={load} />
            <h3 className="font-serif text-2xl text-forest">Policies</h3>
            <p className="text-sm text-muted">
              Stay cancellation text is published with Pricing. Legal pages stay unpublished drafts until the owner approves them.
            </p>
            <h3 className="font-serif text-2xl text-forest">FAQs and messages</h3>
            <ul className="space-y-2 text-sm">
              {(overview.faqDrafts ?? []).map((f) => (
                <li key={f.q}>
                  {f.published ? "Published" : "Draft"} · {f.q}
                </li>
              ))}
              {overview.notifications.length === 0 ? <li>No notification records.</li> : null}
              {overview.notifications.map((n) => (
                <li key={n.id}>
                  {n.status} · {n.type} · {n.to} · {n.subject}
                  {n.error ? ` — ${n.error}` : ""}
                </li>
              ))}
              {overview.contactsList.map((c) => (
                <li key={c.id}>
                  Contact · {c.name} · {c.email}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {tab === "Settings" ? (
          <div className="space-y-6 text-sm">
            <p>Time zone is Asia/Kolkata. Capacity, hours, hold buffer, and booking windows are edited in Pricing and only apply after publish.</p>
            <p>
              Roles: owner/admin (all), reservations (enquiries, calendar, quotes), operations (schedules and arrival data), content
              (public editorial). Refunds, gateway settings, and deleting sensitive records stay owner/admin.
            </p>
            <p>No default production password is shipped. Connect Supabase Auth for named staff accounts.</p>
            <h3 className="font-serif text-2xl text-forest">Notification templates</h3>
            <ul className="space-y-2">
              {(overview.notificationTemplates ?? []).map((t) => (
                <li key={t.id}>
                  {t.name} · {t.subject}
                </li>
              ))}
            </ul>
            <TemplateForm kind="notification" onDone={load} />
            <h3 className="font-serif text-2xl text-forest">Integrations</h3>
            <dl className="grid gap-2 md:grid-cols-2">
              {Object.entries(overview.integrations).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-ivory p-3">
                  <dt className="text-muted">{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        {tab === "Audit" ? (
          <div className="space-y-4 text-sm">
            <dl className="grid gap-3 md:grid-cols-4">
              {[
                ["Confirmed stays", overview.reports?.confirmedStays ?? 0],
                ["Stay nights", overview.reports?.stayNights ?? 0],
                ["Confirmed events", overview.reports?.confirmedEvents ?? 0],
                ["Captured revenue", `₹${((overview.reports?.capturedRevenueMinor ?? 0) / 100).toLocaleString("en-IN")}`],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-2xl bg-ivory p-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium text-forest">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-muted">Occupancy is whole-estate only. Revenue is captured payments, not unpublished quotes.</p>
            <ul className="max-h-[28rem] space-y-1 overflow-auto">
              {overview.audit.map((a, i) => (
                <li key={i}>
                  {a.at} · {a.action} · {a.entity}:{a.entityId}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function QuoteForm({ onDone }: { onDone: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enquiryReference: form.get("enquiryReference"),
        dueNowMinor: Math.round(Number(form.get("dueNowInr")) * 100),
        lineItems: [{ label: String(form.get("label")), amountMinor: Math.round(Number(form.get("amountInr")) * 100) }],
      }),
    });
    const data = await res.json();
    setNotice(res.ok ? `Quote ${data.quote?.reference} issued.` : data.error);
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-2 border-t pt-4 text-sm md:grid-cols-2">
      <input name="enquiryReference" placeholder="Enquiry reference" className="field" required />
      <input name="label" placeholder="Line item" className="field" required />
      <input name="amountInr" type="number" placeholder="Line amount INR" className="field" required />
      <input name="dueNowInr" type="number" placeholder="Due now INR" className="field" required />
      <button className="btn-primary md:col-span-2">Issue quote</button>
      {notice ? <p className="md:col-span-2">{notice}</p> : null}
    </form>
  );
}

function EventsDesk({
  events,
  onDone,
}: {
  events: Overview["eventsList"];
  onDone: () => void;
}) {
  async function act(reference: string, action: "review" | "decline") {
    await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, action }),
    });
    onDone();
  }
  return (
    <div className="space-y-3 text-sm">
      {events.length === 0 ? <p>No event enquiries.</p> : null}
      {events.map((e) => (
        <div key={e.reference} className="rounded-2xl bg-ivory p-3">
          <p>
            {e.reference} · {e.status} · {e.eventType} · {e.startDate} → {e.endDate}
          </p>
          <p className="text-muted">
            {e.guestName} · {e.expectedAttendees ?? "attendance unset"} · quote {e.quoteReference ?? "none"} {e.quoteStatus ?? ""}
          </p>
          {e.setupRequirements ? <p>Requirements: {e.setupRequirements}</p> : null}
          {e.vendorRequests ? <p>Vendors: {e.vendorRequests}</p> : null}
          {e.notes ? <p>{e.notes}</p> : null}
          <div className="mt-2 flex gap-2">
            <button className="btn-secondary !min-h-9 !px-3" onClick={() => act(e.reference, "review")}>
              Mark review
            </button>
            <button className="btn-secondary !min-h-9 !px-3" onClick={() => act(e.reference, "decline")}>
              Decline
            </button>
          </div>
        </div>
      ))}
      <QuoteForm onDone={onDone} />
    </div>
  );
}

function OpsForm({ notes, onDone }: { notes: Overview["operationsNotes"]; onDone: () => void }) {
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: form.get("date"), kind: form.get("kind"), note: form.get("note") }),
    });
    onDone();
  }
  return (
    <div className="space-y-4 text-sm">
      <form onSubmit={onSubmit} className="grid gap-2 md:grid-cols-3">
        <input name="date" type="date" required className="field" />
        <input name="kind" placeholder="turnover / setup / arrival" required className="field" />
        <input name="note" placeholder="Operational note" required className="field" />
        <button className="btn-primary md:col-span-3">Add note</button>
      </form>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id}>
            {n.date} · {n.kind} · {n.note}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RefundForm({ onDone }: { onDone: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: form.get("paymentId"),
        amountMinor: Math.round(Number(form.get("amountInr")) * 100),
        reason: form.get("reason"),
      }),
    });
    const data = await res.json();
    setNotice(data.notice ?? data.error);
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-2 md:grid-cols-3">
      <input name="paymentId" placeholder="Payment or order id" required className="field" />
      <input name="amountInr" type="number" placeholder="Amount INR" required className="field" />
      <input name="reason" placeholder="Reason" required className="field" />
      <button className="btn-primary md:col-span-3">Record refund (does not claim gateway success)</button>
      {notice ? <p className="md:col-span-3">{notice}</p> : null}
    </form>
  );
}

function ContentForm({ cms, onDone }: { cms: Record<string, string | boolean>; onDone: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heroTagline: form.get("heroTagline"),
        heroBody: form.get("heroBody"),
        about: form.get("about"),
        farmStory: form.get("farmStory"),
        contactPhone: form.get("contactPhone"),
        contactEmail: form.get("contactEmail"),
        whatsapp: form.get("whatsapp"),
        address: form.get("address"),
        mapsUrl: form.get("mapsUrl"),
        supportHours: form.get("supportHours"),
        published: form.get("published") === "on",
        faqQ: form.get("faqQ") || undefined,
        faqA: form.get("faqA") || undefined,
        faqPublished: form.get("faqPublished") === "on",
      }),
    });
    const data = await res.json();
    setNotice(res.ok ? (data.cms.published ? "Published to public pages." : "Draft saved. Not public until published.") : data.error);
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 text-sm">
      <p className="text-muted">Leave fields empty to keep unpublished facts off the public site. Do not invent a phone or address.</p>
      <input name="heroTagline" defaultValue={String(cms.heroTagline ?? "")} placeholder="Hero tagline" className="field" />
      <textarea name="heroBody" defaultValue={String(cms.heroBody ?? "")} placeholder="Hero supporting copy" className="field" />
      <textarea name="about" defaultValue={String(cms.about ?? "")} placeholder="About" rows={4} className="field" />
      <textarea name="farmStory" defaultValue={String(cms.farmStory ?? "")} placeholder="Farm story" rows={4} className="field" />
      <input name="contactPhone" defaultValue={String(cms.contactPhone ?? "")} placeholder="Public phone (only if verified)" className="field" />
      <input name="contactEmail" defaultValue={String(cms.contactEmail ?? "")} placeholder="Public email" className="field" />
      <input name="whatsapp" defaultValue={String(cms.whatsapp ?? "")} placeholder="WhatsApp link" className="field" />
      <input name="address" defaultValue={String(cms.address ?? "")} placeholder="Address" className="field" />
      <input name="mapsUrl" defaultValue={String(cms.mapsUrl ?? "")} placeholder="Maps URL" className="field" />
      <input name="supportHours" defaultValue={String(cms.supportHours ?? "")} placeholder="Support hours" className="field" />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="published" defaultChecked={Boolean(cms.published)} />
        Publish these fields
      </label>
      <input name="faqQ" placeholder="FAQ question (optional draft)" className="field" />
      <textarea name="faqA" placeholder="FAQ answer" className="field" />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="faqPublished" />
        Publish this FAQ (only if owner-approved)
      </label>
      <button className="btn-primary">Save content</button>
      {notice ? <p>{notice}</p> : null}
    </form>
  );
}

function MapForm({ zones, onDone }: { zones: Overview["mapZones"]; onDone: () => void }) {
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: form.get("id"),
        label: form.get("label"),
        detail: form.get("detail"),
        published: form.get("published") === "on",
      }),
    });
    onDone();
  }
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted">Do not publish coordinates or invented facilities. Unpublished zones stay off the public schematic.</p>
      {zones.map((z) => (
        <form key={z.id} onSubmit={save} className="grid gap-2 rounded-2xl bg-ivory p-3 md:grid-cols-2">
          <input name="id" type="hidden" value={z.id} />
          <input name="label" defaultValue={z.label} className="field" />
          <textarea name="detail" defaultValue={z.detail} className="field md:col-span-2" />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="published" defaultChecked={z.published} /> Published
          </label>
          <button className="btn-primary">Save zone</button>
        </form>
      ))}
    </div>
  );
}

function rupeeField(minor: number | null) {
  return minor == null ? "" : String(minor / 100);
}

function draftFieldsFromState(d: Record<string, unknown> = {}) {
  return {
    weekday: rupeeField(typeof d.weekdayMinor === "number" ? d.weekdayMinor : null),
    weekend: rupeeField(typeof d.weekendMinor === "number" ? d.weekendMinor : null),
    taxBps: d.taxBps == null ? "" : String(d.taxBps),
    depositBps: d.depositBps == null ? "" : String(d.depositBps),
    maxGuests: d.maxGuests == null ? "" : String(d.maxGuests),
    minNights: d.minNights == null ? "" : String(d.minNights),
    maxNights: d.maxNights == null ? "" : String(d.maxNights),
    checkInTime: typeof d.checkInTime === "string" ? d.checkInTime : "",
    checkOutTime: typeof d.checkOutTime === "string" ? d.checkOutTime : "",
    cancellationSummary: typeof d.cancellationSummary === "string" ? d.cancellationSummary : "",
    holdMinutes: String(typeof d.holdMinutes === "number" ? d.holdMinutes : 15),
    minAdvanceDays: d.minAdvanceDays == null ? "" : String(d.minAdvanceDays),
    maxAdvanceDays: d.maxAdvanceDays == null ? "" : String(d.maxAdvanceDays),
    closedToArrival: Array.isArray(d.closedToArrival) ? d.closedToArrival.join(",") : "",
    termsConfirmed: d.termsConfirmed ? "on" : "",
    privacyConfirmed: d.privacyConfirmed ? "on" : "",
    seasonal: JSON.stringify(d.seasonal ?? []),
  };
}

function PricingForm({ onDone }: { onDone: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [gaps, setGaps] = useState<string[]>([]);
  const [live, setLive] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  function applyState(data: { draft?: Record<string, unknown>; live?: boolean; draftGaps?: string[]; missingSettings?: string[] }) {
    if (data.draft) setDraft(draftFieldsFromState(data.draft));
    setLive(Boolean(data.live));
    setGaps(data.missingSettings ?? data.draftGaps ?? []);
  }

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setLoadError(data.error ?? "Could not load stay settings.");
          return;
        }
        setLoadError(null);
        applyState(data);
      })
      .catch(() => setLoadError("Could not load stay settings."));
  }, []);

  function optionalInt(raw: string, label: string) {
    if (raw === "") return { ok: true as const, value: null };
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false as const, error: `${label} must be a whole number.` };
    return { ok: true as const, value: n };
  }

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
          setNotice("Seasonal rates must be JSON: [{startDate,endDate,nightlyInr}]. Leave [] if none.");
          return;
        }
      }
      const weekday = draft.weekday === "" ? null : Math.round(Number(draft.weekday) * 100);
      const weekend = draft.weekend === "" ? null : Math.round(Number(draft.weekend) * 100);
      if (draft.weekday !== "" && !Number.isFinite(weekday)) {
        setNotice("Weekday INR must be a number.");
        return;
      }
      if (draft.weekend !== "" && !Number.isFinite(weekend)) {
        setNotice("Weekend INR must be a number.");
        return;
      }
      const tax = optionalInt(draft.taxBps ?? "", "Tax bps");
      const deposit = optionalInt(draft.depositBps ?? "", "Deposit bps");
      const guests = optionalInt(draft.maxGuests ?? "", "Max guests");
      const minN = optionalInt(draft.minNights ?? "", "Min nights");
      const maxN = optionalInt(draft.maxNights ?? "", "Max nights");
      const hold = optionalInt(draft.holdMinutes || "15", "Hold minutes");
      const minAdv = optionalInt(draft.minAdvanceDays ?? "", "Min advance days");
      const maxAdv = optionalInt(draft.maxAdvanceDays ?? "", "Max advance days");
      const ints = [tax, deposit, guests, minN, maxN, hold, minAdv, maxAdv];
      const bad = ints.find((item) => !item.ok);
      if (bad && !bad.ok) {
        setNotice(bad.error);
        return;
      }
      body.weekdayMinor = weekday;
      body.weekendMinor = weekend;
      body.taxBps = tax.ok ? tax.value : null;
      body.depositBps = deposit.ok ? deposit.value : null;
      body.maxGuests = guests.ok ? guests.value : null;
      body.minNights = minN.ok ? minN.value : null;
      body.maxNights = maxN.ok ? maxN.value : null;
      body.checkInTime = draft.checkInTime || null;
      body.checkOutTime = draft.checkOutTime || null;
      body.cancellationSummary = draft.cancellationSummary || null;
      body.holdMinutes = hold.ok && hold.value != null ? hold.value : 15;
      body.minAdvanceDays = minAdv.ok ? minAdv.value : null;
      body.maxAdvanceDays = maxAdv.ok ? maxAdv.value : null;
      body.closedToArrival = (draft.closedToArrival ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      body.termsConfirmed = draft.termsConfirmed === "on";
      body.privacyConfirmed = draft.privacyConfirmed === "on";
      body.seasonal = seasonal;
    }
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    applyState(data);
    if (res.status === 401) {
      setNotice("Session expired. Sign in again.");
      return;
    }
    if (res.status === 403) {
      setNotice("Only owner or admin staff can save or publish stay pricing.");
      return;
    }
    if (res.status === 422) {
      setNotice("Draft saved in the database. Publish is blocked until every required field listed below is valid. Checkout stays off.");
      onDone();
      return;
    }
    if (!res.ok) {
      setNotice(data.error ?? "Could not save.");
      return;
    }
    setNotice(action === "publish" ? "Published. Public stays now read this snapshot." : action === "unpublish" ? "Unpublished. Public checkout is off." : "Draft saved. Refresh this tab to confirm it reloads from the database. Checkout stays off until you publish.");
    onDone();
  }

  if (loadError) {
    return <p className="mt-4 text-sm text-dragon">{loadError}</p>;
  }

  return (
    <form onSubmit={(e) => send("save-draft", e)} className="mt-6 grid gap-3 text-sm md:grid-cols-2">
      <p className="col-span-full text-muted">
        Whole-property INR per night for all five rooms together. Public booking reads only the published snapshot, never this draft.
      </p>
      <p className="col-span-full text-xs uppercase">{live ? "Live booking: on" : "Live booking: off"}</p>
      <label htmlFor="pricing-weekday">Weekday nightly rate (INR)<input id="pricing-weekday" value={draft.weekday ?? ""} onChange={(e) => setDraft({ ...draft, weekday: e.target.value })} type="number" min={1} step={1} className="field" /></label>
      <label htmlFor="pricing-weekend">Weekend nightly rate (INR)<input id="pricing-weekend" value={draft.weekend ?? ""} onChange={(e) => setDraft({ ...draft, weekend: e.target.value })} type="number" min={1} step={1} className="field" /></label>
      <label htmlFor="pricing-tax">Tax (basis points, 0 = no tax)<input id="pricing-tax" value={draft.taxBps ?? ""} onChange={(e) => setDraft({ ...draft, taxBps: e.target.value })} type="number" min={0} max={10000} className="field" /></label>
      <label htmlFor="pricing-deposit">Deposit due now (basis points, 10000 = pay in full)<input id="pricing-deposit" value={draft.depositBps ?? ""} onChange={(e) => setDraft({ ...draft, depositBps: e.target.value })} type="number" min={0} max={10000} className="field" /></label>
      <label htmlFor="pricing-guests">Maximum overnight guests<input id="pricing-guests" value={draft.maxGuests ?? ""} onChange={(e) => setDraft({ ...draft, maxGuests: e.target.value })} type="number" min={1} className="field" /></label>
      <label htmlFor="pricing-min-nights">Minimum nights<input id="pricing-min-nights" value={draft.minNights ?? ""} onChange={(e) => setDraft({ ...draft, minNights: e.target.value })} type="number" min={1} className="field" /></label>
      <label htmlFor="pricing-max-nights">Maximum nights<input id="pricing-max-nights" value={draft.maxNights ?? ""} onChange={(e) => setDraft({ ...draft, maxNights: e.target.value })} type="number" min={1} className="field" /></label>
      <label htmlFor="pricing-hold">Hold minutes (5–120)<input id="pricing-hold" value={draft.holdMinutes ?? "15"} onChange={(e) => setDraft({ ...draft, holdMinutes: e.target.value })} type="number" min={5} max={120} className="field" /></label>
      <label htmlFor="pricing-min-adv">Min advance days (optional)<input id="pricing-min-adv" value={draft.minAdvanceDays ?? ""} onChange={(e) => setDraft({ ...draft, minAdvanceDays: e.target.value })} type="number" min={0} className="field" /></label>
      <label htmlFor="pricing-max-adv">Max advance days (optional)<input id="pricing-max-adv" value={draft.maxAdvanceDays ?? ""} onChange={(e) => setDraft({ ...draft, maxAdvanceDays: e.target.value })} type="number" min={1} className="field" /></label>
      <label htmlFor="pricing-cta" className="col-span-full">Closed-to-arrival dates (optional, YYYY-MM-DD, comma-separated)<input id="pricing-cta" value={draft.closedToArrival ?? ""} onChange={(e) => setDraft({ ...draft, closedToArrival: e.target.value })} className="field" /></label>
      <label htmlFor="pricing-checkin">Check-in time<input id="pricing-checkin" value={draft.checkInTime ?? ""} onChange={(e) => setDraft({ ...draft, checkInTime: e.target.value })} type="time" className="field" /></label>
      <label htmlFor="pricing-checkout">Check-out time<input id="pricing-checkout" value={draft.checkOutTime ?? ""} onChange={(e) => setDraft({ ...draft, checkOutTime: e.target.value })} type="time" className="field" /></label>
      <label htmlFor="pricing-cancel" className="col-span-full">Cancellation and refund policy (at least 20 characters)<textarea id="pricing-cancel" value={draft.cancellationSummary ?? ""} onChange={(e) => setDraft({ ...draft, cancellationSummary: e.target.value })} className="field" /></label>
      <label htmlFor="pricing-seasonal" className="col-span-full">Seasonal rates JSON (optional, [] if none)<textarea id="pricing-seasonal" value={draft.seasonal ?? "[]"} onChange={(e) => setDraft({ ...draft, seasonal: e.target.value })} className="field" /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.termsConfirmed === "on"} onChange={(e) => setDraft({ ...draft, termsConfirmed: e.target.checked ? "on" : "" })} /> Confirm terms of stay apply at checkout</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.privacyConfirmed === "on"} onChange={(e) => setDraft({ ...draft, privacyConfirmed: e.target.checked ? "on" : "" })} /> Confirm privacy policy applies at checkout</label>
      {gaps.length ? <ul className="col-span-full list-disc pl-5 text-dragon">{gaps.map((g) => <li key={g}>{g}</li>)}</ul> : null}
      <div className="col-span-full flex flex-wrap gap-2">
        <button type="submit" className="btn-primary">Save draft</button>
        <button type="button" className="btn-accent" onClick={() => send("publish")}>Publish</button>
        <button type="button" className="btn-secondary" onClick={() => send("unpublish")}>Unpublish</button>
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
      body: JSON.stringify({ startDate: form.get("startDate"), endDate: form.get("endDate"), reason: form.get("reason") }),
    });
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-2 text-sm md:grid-cols-4">
      <input name="startDate" type="date" required className="field" />
      <input name="endDate" type="date" required className="field" />
      <input name="reason" required placeholder="Reason" className="field" />
      <button className="btn-primary">Close dates</button>
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
    <form onSubmit={onSubmit} className="grid gap-2 text-sm md:grid-cols-2">
      <select name="slug" required className="field">
        <option value="room-1">Room 1</option>
        <option value="room-2">Room 2</option>
        <option value="room-3">Room 3</option>
        <option value="room-4">Room 4</option>
        <option value="room-5">Room 5</option>
      </select>
      <input name="image" placeholder="/images/rooms/room-1.png" className="field" />
      <textarea name="publishedSummary" placeholder="Owner-approved description" className="field md:col-span-2" />
      <label className="flex items-center gap-2"><input type="checkbox" name="photographPublished" /> Publish photograph</label>
      <button className="btn-primary">Save room media</button>
    </form>
  );
}

function OfflinePayForm({ onDone }: { onDone: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/offline-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: form.get("reference"),
        amountMinor: Math.round(Number(form.get("amountInr")) * 100),
        method: form.get("method"),
        note: form.get("note"),
      }),
    });
    const data = await res.json();
    setNotice(data.notice ?? data.error);
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-2 md:grid-cols-2">
      <input name="reference" placeholder="Stay or quote reference" required className="field" />
      <input name="amountInr" type="number" placeholder="Amount INR" required className="field" />
      <input name="method" placeholder="Cash / transfer" required className="field" />
      <input name="note" placeholder="Note" required className="field" />
      <button className="btn-secondary md:col-span-2">Log offline payment (does not capture Razorpay)</button>
      {notice ? <p className="md:col-span-2">{notice}</p> : null}
    </form>
  );
}

function TemplateForm({ kind, onDone }: { kind: "event" | "notification"; onDone: () => void }) {
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        name: form.get("name"),
        notes: form.get("notes") || undefined,
        depositBps: form.get("depositBps") ? Number(form.get("depositBps")) : null,
        subject: form.get("subject") || undefined,
        body: form.get("body") || undefined,
      }),
    });
    onDone();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-2 text-sm md:grid-cols-2">
      <input name="name" placeholder="Template name" required className="field" />
      {kind === "event" ? (
        <>
          <input name="depositBps" type="number" placeholder="Deposit bps (optional)" className="field" />
          <textarea name="notes" placeholder="Package notes" className="field md:col-span-2" />
        </>
      ) : (
        <>
          <input name="subject" placeholder="Subject" className="field" />
          <textarea name="body" placeholder="Body" className="field md:col-span-2" />
        </>
      )}
      <button className="btn-secondary md:col-span-2">Save template</button>
    </form>
  );
}
