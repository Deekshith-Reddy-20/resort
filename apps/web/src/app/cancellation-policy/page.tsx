import { POLICIES } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cancellation policy" };

export default function CancellationPage() {
  return (
    <main>
      <PageHero title={POLICIES.cancellation.title} />
      <article className="mx-auto max-w-3xl px-4 py-16 leading-relaxed text-forest/80">{POLICIES.cancellation.body}</article>
    </main>
  );
}
