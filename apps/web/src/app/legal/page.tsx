import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Legal",
  "Privacy, stay terms, event terms, and cancellation drafts for V-Farms. These pages are not a substitute for owner-approved legal review.",
);

const LINKS = [
  { href: "/privacy", title: "Privacy", body: "How guest contact details are collected and limited." },
  { href: "/terms", title: "Terms of stay", body: "Whole-property overnight stay conditions. Unpublished inclusions stay unpublished." },
  { href: "/event-terms", title: "Event terms", body: "Enquiry and quote rules. Overnight room use is not presumed." },
  { href: "/cancellation-policy", title: "Cancellation and refunds", body: "Published stay cancellation text after the owner approves it." },
];

export default function LegalPage() {
  return (
    <main>
      <PageHero
        kicker="Policies"
        title="Legal"
        body="These drafts disclose booking and payment rules. Permits, GST classification, and final wording need a qualified local reviewer before live reservations."
      />
      <section className="mx-auto grid max-w-3xl gap-4 px-4 py-16">
        {LINKS.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-3xl bg-white p-6">
            <h2 className="font-serif text-2xl text-forest">{item.title}</h2>
            <p className="mt-2 text-sm text-muted">{item.body}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
