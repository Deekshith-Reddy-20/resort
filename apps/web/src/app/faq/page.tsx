import type { Metadata } from "next";
import { FaqAccordion } from "@/components/FaqAccordion";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <main>
      <PageHero kicker="Help" title="Questions" body="Answers use only confirmed facts. Unpublished rates, capacity, and contact numbers are stated as missing." />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <FaqAccordion />
      </section>
    </main>
  );
}
