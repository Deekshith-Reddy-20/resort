import { Suspense } from "react";
import { StayFlow } from "@/components/StayFlow";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Stays",
  "Reserve the entire V-Farms estate near Hyderabad. All five rooms are included in one exclusive overnight booking. Individual rooms are not sold.",
);

export default function StaysPage() {
  return (
    <Suspense fallback={<div className="px-4 py-24 text-center text-muted">Loading stay form…</div>}>
      <StayFlow />
    </Suspense>
  );
}
