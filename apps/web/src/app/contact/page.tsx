import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";
import { pageMeta } from "@/lib/seo";
import { publicProperty } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = pageMeta(
  "Contact",
  "Write to V-Farms. Public phone and email appear only after the owner publishes them.",
);

export default function ContactPage() {
  const contact = publicProperty().contact;
  const hasPublished = Boolean(contact.phone || contact.email || contact.whatsapp || contact.address);
  return (
    <main>
      <PageHero
        kicker="Contact"
        title="Write to V-Farms"
        body={
          hasPublished
            ? "Use the published details below, or send a message. Unpublished numbers are not shown."
            : "A public phone number, WhatsApp, and email address have not been published. This form stores your message for the owner."
        }
      />
      <section className="mx-auto max-w-xl space-y-6 px-4 py-16">
        {hasPublished ? (
          <div className="rounded-3xl bg-white p-6 text-sm text-forest">
            {contact.phone ? <p>Phone: {contact.phone}</p> : null}
            {contact.email ? <p>Email: {contact.email}</p> : null}
            {contact.whatsapp ? (
              <p>
                WhatsApp:{" "}
                <a className="text-dragon" href={contact.whatsapp}>
                  Open chat
                </a>
              </p>
            ) : null}
            {contact.address ? <p>Address: {contact.address}</p> : null}
            {contact.mapsUrl ? (
              <p>
                <a className="text-dragon" href={contact.mapsUrl}>
                  Open map
                </a>
              </p>
            ) : null}
            {contact.supportHours ? <p>Hours: {contact.supportHours}</p> : null}
          </div>
        ) : null}
        <ContactForm />
      </section>
    </main>
  );
}
