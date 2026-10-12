import { POLICIES } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Terms of stay", POLICIES.terms.body.slice(0, 155));

export default function TermsPage() {
  return (
    <main>
      <PageHero title={POLICIES.terms.title} />
      <article className="mx-auto max-w-3xl px-4 py-16 leading-relaxed text-forest/80">{POLICIES.terms.body}</article>
    </main>
  );
}
