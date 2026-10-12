"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PRIMARY_NAV } from "@/lib/content";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const overlay = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  const solid = !overlay || scrolled || open;
  const linkBase = solid ? "text-forest/80 hover:text-forest" : "text-ivory/85 hover:text-white";
  const active = solid ? "text-forest" : "text-ivory";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition ${
          solid ? "border-b border-stone/60 bg-ivory/95 backdrop-blur-md" : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex min-h-11 items-center gap-3" aria-label="V-Farms home">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border font-serif text-lg ${
                solid ? "border-forest/20 text-forest" : "border-ivory/40 text-ivory"
              }`}
            >
              V
            </span>
            <span>
              <span className={`block font-serif text-xl leading-none ${solid ? "text-forest" : "text-ivory"}`}>V-Farms</span>
              <span className={`hidden text-[10px] uppercase tracking-[0.18em] sm:block ${solid ? "text-muted" : "text-ivory/70"}`}>
                A singular escape to nature
              </span>
            </span>
          </Link>
          <nav className="hidden items-center 2xl:flex" aria-label="Primary">
            {PRIMARY_NAV.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-full px-2.5 py-2 text-[13px] ${isActive ? `${active} underline decoration-dragon/70 underline-offset-8` : linkBase}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link href={overlay ? "/#availability" : "/stays"} className="btn-primary !min-h-10 !px-4 !py-2 text-xs">
              Check Availability
            </Link>
          </div>
          <button
            type="button"
            className={`min-h-11 min-w-11 rounded-full border px-3 text-sm 2xl:hidden ${solid ? "border-forest/20 text-forest" : "border-ivory/50 text-ivory"}`}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
        {open ? (
          <nav id="mobile-nav" className="max-h-[calc(100vh-4.5rem)] space-y-1 overflow-y-auto border-t border-stone bg-ivory px-4 py-4 2xl:hidden" aria-label="Mobile">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block min-h-11 rounded-xl px-3 py-3 text-forest hover:bg-beige"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href={overlay ? "/#availability" : "/stays"} className="btn-primary mt-2 w-full" onClick={() => setOpen(false)}>
              Check Availability
            </Link>
          </nav>
        ) : null}
      </header>
      {overlay ? null : <div aria-hidden className="h-[72px]" />}
    </>
  );
}
