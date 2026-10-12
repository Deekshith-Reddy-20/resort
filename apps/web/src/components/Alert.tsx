import type { ReactNode } from "react";

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "error" | "success";
  title?: string;
  children: ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-dragon/30 bg-white text-dragon"
      : tone === "success"
        ? "border-forest/20 bg-white text-forest"
        : "border-stone bg-white text-forest";
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${styles}`} role={tone === "error" ? "alert" : "status"}>
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-stone/60 ${className}`} aria-hidden />;
}
