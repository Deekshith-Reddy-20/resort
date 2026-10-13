"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHero } from "@/components/PageHero";

type QuoteView = {
  quote: {
    reference: string;
    status: string;
    totalMinor: number;
    dueNowMinor: number;
    lineItems: { label: string; amountMinor: number }[];
    expiresAt?: string;
  };
  enquiry: {
    reference: string;
    status: string;
    eventType: string;
    startDate: string;
    endDate: string;
    expectedAttendees?: number;
  };
  holdExpiresAt: string | null;
  paymentsConfigured: boolean;
};

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function rupees(minor: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(minor / 100);
}

export default function EventQuotePage() {
  const params = useParams<{ reference: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [view, setView] = useState<QuoteView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/events/quotes/${params.reference}/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not open this quote.");
      setView(null);
      return;
    }
    setView(data);
  }

  async function accept() {
    setError(null);
    const res = await fetch(`/api/events/quotes/${params.reference}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "The dates could not be held.");
      return;
    }
    setNotice("Quote accepted. A temporary whole-estate hold is active until the deposit is verified.");
    const again = await fetch(`/api/events/quotes/${params.reference}/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone }),
    });
    if (again.ok) setView(await again.json());
  }

  async function pay() {
    setPaying(true);
    setNotice(null);
    try {
      const res = await fetch("/api/payments/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteReference: params.reference }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "Payment is unavailable.");
        return;
      }
      if (!window.Razorpay) throw new Error("Razorpay Checkout did not load.");
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "V-Farms",
        description: `Event deposit ${data.receipt}`,
        order_id: data.orderId,
        notes: { quoteReference: params.reference },
        theme: { color: "#123D2D" },
        handler: async (response: RazorpaySuccess) => {
          const verified = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const body = await verified.json();
          if (body.status === "confirmed" || body.status === "already_captured") {
            router.push(`/booking/payment-status?reference=${encodeURIComponent(params.reference)}`);
            return;
          }
          setNotice(
            body.status === "paid_unbooked"
              ? "Payment was verified after the hold expired or the dates were taken. This is an exception, not a confirmed event."
              : `Payment is ${body.status ?? "pending"} until the server confirms the reservation.`,
          );
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setNotice("Checkout was closed. No payment was captured.");
          },
        },
      });
      checkout.open();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Payment could not start.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <main>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <PageHero
        kicker="Event quote"
        title="Review a written quotation"
        body="Accepting a quote takes a temporary whole-estate hold. Overnight rooms, catering, and vendors are included only if the quote says so. Checkout on this device is not confirmation."
      />
      <section className="mx-auto max-w-2xl space-y-6 px-4 py-16">
        <form onSubmit={lookup} className="grid gap-3 rounded-3xl bg-white p-6">
          <p className="text-sm text-muted">Open quote {params.reference} with the organiser email and phone used on the enquiry.</p>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="field" />
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="field" />
          <button className="btn-primary">Open quote</button>
        </form>
        {error ? <p className="text-dragon">{error}</p> : null}
        {view ? (
          <div className="space-y-4 rounded-3xl bg-white p-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-dragon">
              {view.quote.status} · enquiry {view.enquiry.status}
            </p>
            <h2 className="font-serif text-3xl text-forest">{view.quote.reference}</h2>
            <p>
              Exclusive event for the entire estate. {view.enquiry.eventType} · {view.enquiry.startDate} → {view.enquiry.endDate}
              {view.enquiry.expectedAttendees ? ` · ${view.enquiry.expectedAttendees} attendees requested` : ""}
            </p>
            <ul className="space-y-2 text-sm">
              {view.quote.lineItems.map((line) => (
                <li key={line.label} className="flex justify-between gap-4">
                  <span>{line.label}</span>
                  <span>{rupees(line.amountMinor)}</span>
                </li>
              ))}
            </ul>
            <p className="flex justify-between font-medium">
              <span>Quoted total</span>
              <span>{rupees(view.quote.totalMinor)}</span>
            </p>
            <p className="text-sm text-muted">Deposit due now {rupees(view.quote.dueNowMinor)}</p>
            {view.holdExpiresAt ? (
              <p className="rounded-2xl bg-ivory px-4 py-3 text-sm">
                Hold expires {new Date(view.holdExpiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (Asia/Kolkata).
              </p>
            ) : null}
            {view.quote.status === "issued" ? (
              <button type="button" className="btn-accent" onClick={accept}>
                Accept terms and hold the estate
              </button>
            ) : null}
            {view.quote.status === "accepted" && view.paymentsConfigured ? (
              <button type="button" className="btn-primary" disabled={paying} onClick={pay}>
                {paying ? "Opening checkout…" : "Pay deposit"}
              </button>
            ) : view.quote.status === "accepted" ? (
              <p className="text-sm text-muted">Razorpay keys are not configured. The hold does not become a confirmed event until verified payment or an owner offline confirmation.</p>
            ) : null}
            {notice ? <p className="text-sm text-dragon">{notice}</p> : null}
          </div>
        ) : null}
        <Link href="/events" className="text-dragon">
          Back to event enquiry
        </Link>
      </section>
    </main>
  );
}
