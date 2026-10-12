import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Contact",
  "Write to V-Farms. A public phone number and email have not been published. Messages are stored for the owner.",
);

export default function ContactPage() {
  return (
    <main>
      <PageHero
        kicker="Contact"
        title="Write to V-Farms"
        body="A public phone number, WhatsApp, and email address have not been provided. This form stores your message for the owner."
      />
      <section className="mx-auto max-w-xl px-4 py-16">
        <ContactForm />
      </section>
    </main>
  );
}
