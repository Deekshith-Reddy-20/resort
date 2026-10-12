import { Suspense } from "react";
import { EventsForm } from "@/components/EventsForm";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Events",
  "Enquire about a private gathering at V-Farms. An enquiry is not a booking and does not hold the calendar until the owner issues and you accept a quote.",
);

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="px-4 py-24 text-center text-muted">Loading event form…</div>}>
      <EventsForm />
    </Suspense>
  );
}
