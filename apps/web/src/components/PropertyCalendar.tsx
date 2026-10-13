"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Day = {
  date: string;
  tone: "available" | "unavailable" | "hold" | "past" | "unconfigured";
  label: string;
  blocker: string | null;
  pendingEnquiry: boolean;
  pendingReference: string | null;
};

const toneClass: Record<Day["tone"], string> = {
  available: "bg-[#123D2D] text-ivory",
  unavailable: "bg-[#9B1B30] text-white",
  hold: "bg-[#C47B17] text-white",
  past: "bg-[#D9D2C4] text-forest/70",
  unconfigured: "bg-[#E9E1D4] text-forest",
};

export function PropertyCalendar({
  onRefresh,
}: {
  onRefresh?: () => void;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const [days, setDays] = useState<Day[]>([]);
  const [today, setToday] = useState("");
  const [selected, setSelected] = useState<Day | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const monthParam = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/calendar?month=${monthParam}`);
      const data = await res.json();
      if (res.status === 401) throw new Error("Session expired. Sign in again.");
      if (!res.ok) throw new Error(data.error ?? "Calendar could not be loaded.");
      setDays(data.days ?? []);
      setToday(data.today ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calendar failed.");
    } finally {
      setLoading(false);
    }
  }, [monthParam]);

  useEffect(() => {
    load();
  }, [load]);

  const weekDays = useMemo(() => {
    if (!today) return days.slice(0, 7);
    const idx = days.findIndex((d) => d.date >= today);
    const start = Math.max(0, idx === -1 ? 0 : idx);
    return days.slice(start, start + 7);
  }, [days, today]);

  const shown = view === "week" ? weekDays : days;
  const firstWeekday = new Date(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-01T00:00:00+05:30`).getDay();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary !min-h-9" onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}>
            Previous
          </button>
          <button type="button" className="btn-secondary !min-h-9" onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}>
            Today
          </button>
          <button type="button" className="btn-secondary !min-h-9" onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}>
            Next
          </button>
        </div>
        <p className="font-serif text-2xl text-forest">
          {new Date(cursor.year, cursor.month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-2">
          {(["month", "week", "agenda"] as const).map((v) => (
            <button key={v} type="button" className={`rounded-full px-3 py-1 text-sm ${view === v ? "bg-forest text-ivory" : "bg-ivory"}`} onClick={() => setView(v)}>
              {v}
            </button>
          ))}
          <button type="button" className="btn-secondary !min-h-9" onClick={() => { load(); onRefresh?.(); }}>
            Refresh
          </button>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-3 text-xs">
        <li><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#123D2D]" /> Green · Available</li>
        <li><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#9B1B30]" /> Red · Unavailable</li>
        <li><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#C47B17]" /> Amber · Temporary hold</li>
        <li><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#D9D2C4]" /> Grey · Past / disabled</li>
        <li>Pending enquiry = label only, does not block</li>
      </ul>
      {error ? (
        <p className="mt-4 text-dragon" role="alert">
          {error}{" "}
          <button type="button" className="underline" onClick={load}>
            Retry
          </button>
        </p>
      ) : null}
      {loading ? <p className="mt-4 text-sm text-muted">Updating calendar…</p> : null}
      {view !== "agenda" ? (
        <div className="mt-4">
          <div className="mb-2 grid grid-cols-7 text-center text-[11px] uppercase tracking-wide text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {view === "month"
              ? Array.from({ length: firstWeekday }).map((_, i) => <span key={`pad-${i}`} />)
              : null}
            {shown.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelected(day)}
                className={`min-h-14 rounded-lg p-1 text-left text-xs sm:min-h-16 ${toneClass[day.tone]}`}
                aria-label={`${day.date} ${day.label}${day.pendingEnquiry ? ", pending enquiry" : ""}`}
              >
                <span className="font-medium">{day.date.slice(8)}</span>
                <span className="mt-1 block leading-tight">{day.label}</span>
                {day.pendingEnquiry ? <span className="mt-1 block text-[10px] underline">Pending enquiry</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {shown.filter((d) => d.tone !== "available" || d.pendingEnquiry).map((day) => (
            <li key={day.date}>
              <button type="button" className="w-full rounded-xl bg-ivory px-3 py-2 text-left" onClick={() => setSelected(day)}>
                {day.date} · {day.label}
                {day.blocker ? ` · ${day.blocker}` : ""}
                {day.pendingEnquiry ? " · pending enquiry" : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected ? (
        <aside className="mt-6 rounded-2xl bg-ivory p-4 text-sm" aria-live="polite">
          <p className="text-[11px] uppercase tracking-[0.16em] text-dragon">Selected date</p>
          <p className="mt-1 font-serif text-2xl text-forest">{selected.date}</p>
          <p className="mt-2">{selected.label}</p>
          {selected.blocker ? <p className="mt-1">Reference: {selected.blocker}</p> : null}
          {selected.pendingEnquiry ? <p className="mt-1">Informational enquiry/quote {selected.pendingReference}. Not a hold.</p> : null}
        </aside>
      ) : null}
    </div>
  );
}
