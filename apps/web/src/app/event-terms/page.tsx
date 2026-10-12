import { POLICIES } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Event terms", POLICIES.events.body.slice(0, 155));

export default function EventTermsPage() {
  return (
    <main>
      <PageHero title={POLICIES.events.title} />
      <article className="mx-auto max-w-3xl px-4 py-16 leading-relaxed text-forest/80">{POLICIES.events.body}</article>
    </main>
  );
}
