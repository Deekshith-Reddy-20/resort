import { POLICIES } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of stay" };

export default function TermsPage() {
  return (
    <main>
      <PageHero title={POLICIES.terms.title} />
      <article className="mx-auto max-w-3xl px-4 py-16 leading-relaxed text-forest/80">{POLICIES.terms.body}</article>
    </main>
  );
}
