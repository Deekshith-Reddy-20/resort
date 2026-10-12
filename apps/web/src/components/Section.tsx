import type { ReactNode } from "react";

export function Kicker({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`text-[11px] uppercase tracking-[0.28em] ${light ? "text-ivory/70" : "text-dragon"}`}>{children}</p>
  );
}

export function Container({
  children,
  className = "",
  width = "wide",
}: {
  children: ReactNode;
  className?: string;
  width?: "wide" | "narrow" | "prose";
}) {
  const max = width === "prose" ? "max-w-3xl" : width === "narrow" ? "max-w-5xl" : "max-w-7xl";
  return <div className={`mx-auto ${max} px-4 md:px-6 ${className}`}>{children}</div>;
}
