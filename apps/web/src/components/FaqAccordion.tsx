"use client";

import { FAQS } from "@/lib/content";

export function FaqAccordion({ limit }: { limit?: number }) {
  const items = limit ? FAQS.slice(0, limit) : FAQS;
  return (
    <div className="divide-y divide-stone rounded-3xl border border-stone bg-white">
      {items.map((item) => (
        <details key={item.q} className="group px-5 py-4">
          <summary className="cursor-pointer list-none font-medium text-forest marker:content-none">
            <span className="flex items-start justify-between gap-4">
              {item.q}
              <span className="text-dragon group-open:rotate-45">+</span>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-forest/75">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
