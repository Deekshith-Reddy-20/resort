"use client";

import { useCallback, useEffect, useState } from "react";

type Item = { src: string; alt: string };

export function GalleryLightbox({ items, preview = items.length }: { items: readonly Item[]; preview?: number }) {
  const shown = items.slice(0, preview);
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const next = useCallback(() => setOpen((i) => (i == null ? i : (i + 1) % items.length)), [items.length]);
  const prev = useCallback(() => setOpen((i) => (i == null ? i : (i - 1 + items.length) % items.length)), [items.length]);
  const [touchX, setTouchX] = useState<number | null>(null);

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next, prev]);

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((item, index) => (
          <button
            key={item.src}
            type="button"
            className="mb-4 block w-full overflow-hidden rounded-2xl text-left"
            onClick={() => setOpen(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt={item.alt} className="w-full object-cover transition hover:opacity-95" loading="lazy" />
          </button>
        ))}
      </div>
      {open != null ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-evergreen/92 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photograph viewer"
          onTouchStart={(e) => setTouchX(e.changedTouches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            if (touchX == null) return;
            const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
            if (dx < -40) next();
            if (dx > 40) prev();
            setTouchX(null);
          }}
        >
          <button type="button" className="absolute right-4 top-4 text-ivory" onClick={close}>
            Close
          </button>
          <button type="button" className="absolute left-4 text-ivory" onClick={prev} aria-label="Previous photograph">
            ←
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={items[open].src} alt={items[open].alt} className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain" />
          <button type="button" className="absolute right-4 top-1/2 text-ivory" onClick={next} aria-label="Next photograph">
            →
          </button>
          <p className="absolute bottom-6 max-w-xl text-center text-sm text-ivory/80">{items[open].alt}</p>
        </div>
      ) : null}
    </>
  );
}
