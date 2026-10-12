"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StaySearch } from "./StaySearch";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"video" | "poster">("poster");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduced || mobile || connection?.saveData) {
      setMode("poster");
      return;
    }
    setMode("video");
  }, []);

  useEffect(() => {
    if (mode === "video") videoRef.current?.play().catch(() => setMode("poster"));
  }, [mode]);

  return (
    <section className="relative overflow-hidden bg-evergreen text-ivory">
      {mode === "video" ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/images/estate/hero-poster.jpg"
          onError={() => setMode("poster")}
          aria-label="Aerial film of the V-Farms estate"
        >
          <source src="/videos/vfarms-resort.mp4" type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/estate/hero-poster.jpg"
          alt="Aerial view of V-Farms at dusk"
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
          fetchPriority="high"
        />
      )}
      <div className="absolute inset-0 bg-evergreen/55" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-evergreen to-transparent" />
      <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 pb-40 pt-28 md:px-6">
        <p className="text-[11px] uppercase tracking-[0.42em] text-ivory/75">The private estate</p>
        <h1 className="mt-4 font-serif text-6xl leading-none tracking-tight sm:text-7xl md:text-8xl">V-FARMS</h1>
        <p className="mt-4 font-serif text-2xl italic text-ivory/90 md:text-3xl">A singular escape to nature.</p>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ivory/85 md:text-lg">
          Discover a private countryside retreat surrounded by the natural beauty of a dragon fruit farm, designed for
          meaningful stays and memorable gatherings.
        </p>
        <p className="mt-5 text-sm text-ivory/70">Near Hyderabad, Telangana · Five acres · Five rooms · Exclusive whole-property stays</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/stays" className="btn-accent">
            Plan Your Stay
          </Link>
          <Link href="/estate" className="btn-ghost">
            Explore the Estate
          </Link>
          <Link href="/events" className="text-sm text-ivory/80 underline-offset-4 hover:underline">
            Host an Event
          </Link>
          {mode === "poster" ? (
            <button type="button" className="ml-auto inline-flex items-center gap-2 text-sm text-ivory/80" onClick={() => setMode("video")}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ivory/50" aria-hidden>
                ▶
              </span>
              Watch our film
            </button>
          ) : (
            <button type="button" className="ml-auto text-sm text-ivory/70 underline-offset-4 hover:underline" onClick={() => setMode("poster")}>
              Pause film
            </button>
          )}
        </div>
      </div>
      <div id="availability" className="relative z-10 mx-auto -mt-24 max-w-5xl px-4 pb-10 md:px-6">
        <StaySearch embedded />
      </div>
    </section>
  );
}
