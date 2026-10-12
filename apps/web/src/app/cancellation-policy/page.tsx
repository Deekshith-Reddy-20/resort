import { POLICIES } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Cancellation policy", POLICIES.cancellation.body.slice(0, 155));

export default function CancellationPage() {
  return (
    <main>
      <PageHero title={POLICIES.cancellation.title} />
      <article className="mx-auto max-w-3xl px-4 py-16 leading-relaxed text-forest/80">{POLICIES.cancellation.body}</article>
    </main>
  );
}
