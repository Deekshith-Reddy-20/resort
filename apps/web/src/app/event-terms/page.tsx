import { POLICIES } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Event terms" };

export default function EventTermsPage() {
  return (
    <main>
      <PageHero title={POLICIES.events.title} />
      <article className="mx-auto max-w-3xl px-4 py-16 leading-relaxed text-forest/80">{POLICIES.events.body}</article>
    </main>
  );
}
