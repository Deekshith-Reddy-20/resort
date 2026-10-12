"use client";

import { FormEvent, useState } from "react";
import { PageHero } from "@/components/PageHero";

export default function ContactPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone") || undefined,
        message: form.get("message"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setError(data.error ?? "Could not send.");
    else setStatus(data.notice);
  }

  return (
    <main>
      <PageHero
        kicker="Contact"
        title="Write to V-Farms"
        body="A public phone number, WhatsApp, and email address have not been provided. This form stores your message for the owner."
      />
      <section className="mx-auto max-w-xl px-4 py-16">
        {status ? (
          <p className="rounded-3xl bg-white p-6" role="status">
            {status}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white p-6">
            <label className="block text-sm" htmlFor="contact-name">
              Name
              <input id="contact-name" name="name" required autoComplete="name" className="field" />
            </label>
            <label className="block text-sm" htmlFor="contact-email">
              Email
              <input id="contact-email" name="email" type="email" required autoComplete="email" className="field" />
            </label>
            <label className="block text-sm" htmlFor="contact-phone">
              Phone
              <input id="contact-phone" name="phone" autoComplete="tel" className="field" />
            </label>
            <label className="block text-sm" htmlFor="contact-message">
              Message
              <textarea id="contact-message" name="message" required minLength={10} rows={5} className="field" />
            </label>
            <button type="submit" className="btn-primary disabled:opacity-60" disabled={loading}>
              {loading ? "Sending…" : "Send message"}
            </button>
            <div aria-live="polite">{error ? <p className="text-dragon">{error}</p> : null}</div>
          </form>
        )}
      </section>
    </main>
  );
}
