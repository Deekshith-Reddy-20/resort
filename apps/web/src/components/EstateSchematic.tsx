"use client";

import { useState } from "react";

type Zone = { id: string; label: string; detail: string };

export function EstateSchematic({
  zones,
  note,
}: {
  zones: Zone[];
  note: string;
}) {
  const [active, setActive] = useState(zones[0]?.id ?? "");
  const selected = zones.find((z) => z.id === active) ?? zones[0];

  return (
    <div>
      <p className="text-sm text-muted">{note}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div
          className="relative min-h-[22rem] overflow-hidden rounded-3xl bg-evergreen p-6 text-ivory"
          role="group"
          aria-label="Estate schematic. Approximate only."
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-ivory/60">Schematic · not a surveyed map</p>
          <div className="mt-8 grid h-64 grid-cols-3 gap-3">
            {zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                aria-pressed={active === zone.id}
                className={`rounded-2xl border px-3 py-4 text-left text-sm ${
                  active === zone.id ? "border-ivory bg-ivory/15" : "border-ivory/30 bg-forest/40 hover:bg-forest/70"
                }`}
                onClick={() => setActive(zone.id)}
              >
                <span className="block font-serif text-xl">{zone.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-dragon">Selected zone</p>
          <h3 className="mt-2 font-serif text-3xl text-forest">{selected?.label}</h3>
          <p className="mt-4 text-sm leading-relaxed text-muted">{selected?.detail}</p>
          <ul className="mt-6 space-y-2 text-sm text-forest">
            {zones.map((zone) => (
              <li key={zone.id}>
                <button type="button" className="underline-offset-4 hover:underline" onClick={() => setActive(zone.id)}>
                  {zone.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
