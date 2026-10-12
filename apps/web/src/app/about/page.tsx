import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main>
      <PageHero kicker="About" title="V-Farms" body="A private five-acre dragon fruit farm near Hyderabad, Telangana." />
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-forest/80">
        <p>
          V-Farms is reserved as one exclusive property. Guests do not share the estate with other stay parties, and rooms
          are not sold individually.
        </p>
        <p>
          Founder biography, exact facilities, and operating hours will be published when supplied. This page does not invent
          amenities, reviews, or a street address.
        </p>
      </section>
    </main>
  );
}
