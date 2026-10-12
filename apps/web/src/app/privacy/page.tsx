import { POLICIES } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Privacy", POLICIES.privacy.body.slice(0, 155));

export default function PrivacyPage() {
  return (
    <main>
      <PageHero title={POLICIES.privacy.title} />
      <article className="mx-auto max-w-3xl px-4 py-16 leading-relaxed text-forest/80">{POLICIES.privacy.body}</article>
    </main>
  );
}
