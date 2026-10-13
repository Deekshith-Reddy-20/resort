import { PageHero } from "@/components/PageHero";
import { pageMeta } from "@/lib/seo";
import { publicProperty } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = pageMeta(
  "About",
  "V-Farms is a private five-acre dragon fruit farm near Hyderabad, reserved as one exclusive property. Rooms are not sold individually.",
);

export default function AboutPage() {
  return (
    <main>
      <PageHero kicker="About" title="V-Farms" body="A private five-acre dragon fruit farm near Hyderabad, Telangana." />
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-forest/80">
        <p>{publicProperty().description}</p>
        {publicProperty().farmStory ? <p>{publicProperty().farmStory}</p> : null}
        <p>
          V-Farms is reserved as one exclusive property. Guests do not share the estate with other stay parties, and rooms
          are not sold individually.
        </p>
        <p>
          Founder biography, exact facilities, and operating hours appear only after the owner publishes them. This page does
          not invent amenities, reviews, or a street address.
        </p>
      </section>
    </main>
  );
}
