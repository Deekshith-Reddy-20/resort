"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHero } from "@/components/PageHero";

type Booking = {
  reference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights?: number;
  wholeProperty?: boolean;
  holdExpiresAt?: string;
  paymentsConfigured?: boolean;
  paymentStatus?: string;
  guest: { name: string };
  amount?: {
    totalMinor?: number;
    dueNowMinor?: number;
    subtotalMinor?: number;
    taxMinor?: number;
    lines?: { label: string; amountMinor: number }[];
  };
  policies?: {
    cancellationSummary?: string;
    checkInTime?: string;
    checkOutTime?: string;
    accepted?: boolean;
  };
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

async function loadCheckout(): Promise<NonNullable<Window["Razorpay"]>> {
  if (window.Razorpay) return window.Razorpay;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector("script[data-razorpay-checkout]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay Checkout.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(script);
  });
  if (!window.Razorpay) throw new Error("Razorpay Checkout did not initialize.");
  return window.Razorpay;
}

export default function BookingDetailPage() {
  const params = useParams<{ reference: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payNotice, setPayNotice] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  function loadBooking() {
    return fetch(`/api/bookings/${params.reference}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBooking(data);
        return data as Booking;
      })
      .catch((e) => {
        setError(e.message);
        return null;
      });
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/bookings/${params.reference}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setBooking(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [params.reference]);

  async function verifyAndConfirm(payload: RazorpaySuccess) {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setPayNotice(data.error ?? "The server could not verify this payment.");
      return;
    }
    if (data.status === "confirmed" || data.status === "already_captured") {
      router.push(`/booking/payment-status?reference=${encodeURIComponent(params.reference)}`);
      return;
    }
    if (data.status === "paid_unbooked") {
      setPayNotice(
        "Payment was verified, but the hold had expired or the dates were taken. This is recorded as an exception, not a confirmed stay.",
      );
      loadBooking();
      return;
    }
    setPayNotice(`Payment is ${data.status ?? "pending"} until the server confirms the reservation.`);
    loadBooking();
  }

  async function pay() {
    setPaying(true);
    setPayNotice(null);
    try {
      const res = await fetch("/api/payments/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stayReference: params.reference }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayNotice(data.error ?? "Payment is unavailable.");
        return;
      }
      if (!data.keyId || !data.orderId) {
        setPayNotice("The server did not return checkout credentials.");
        return;
      }
      const Razorpay = await loadCheckout();
      const checkout = new Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "V-Farms",
        description: `Whole-property stay ${data.receipt}`,
        order_id: data.orderId,
        prefill: {},
        notes: { stayReference: params.reference },
        theme: { color: "#123D2D" },
        handler: (response: RazorpaySuccess) => {
          verifyAndConfirm(response).finally(() => setPaying(false));
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setPayNotice("Checkout was closed. No payment was captured. You can retry while the hold is active.");
            loadBooking();
          },
        },
      });
      checkout.open();
    } catch (e) {
      setPayNotice(e instanceof Error ? e.message : "The payment service could not be reached. The hold is unchanged.");
      setPaying(false);
    }
  }

  const lines = booking?.amount?.lines?.length
    ? booking.amount.lines
    : booking?.amount?.subtotalMinor != null
      ? [{ label: "Whole-property stay", amountMinor: booking.amount.subtotalMinor }]
      : [];
  const payable = booking?.status === "held" || booking?.status === "awaiting_payment";
  const canRetry = payable && booking.paymentStatus !== "captured";

  return (
    <main>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <PageHero
        kicker="Reservation"
        title="Review your estate hold"
        body="This hold reserves the whole property for a limited time. Checkout success on the device is not confirmation. Status is taken from the server after signature verification."
      />
      <section className="mx-auto max-w-2xl px-4 py-16">
        {error ? <p className="text-dragon">{error}</p> : null}
        {booking ? (
          <div className="space-y-6 rounded-[2rem] bg-white p-8 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.28em] text-dragon">
              {booking.status} · payment {booking.paymentStatus ?? "none"}
            </p>
            <h2 className="font-serif text-4xl text-forest">{booking.reference}</h2>
            <p className="text-forest/75">
              Exclusive whole-property stay. All five rooms are included. Individual rooms are not sold.
            </p>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-forest/50">Dates</dt>
                <dd>
                  {booking.checkIn} → {booking.checkOut}
                </dd>
              </div>
              <div>
                <dt className="text-forest/50">Nights</dt>
                <dd>{booking.nights ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-forest/50">Guests</dt>
                <dd>{booking.guests}</dd>
              </div>
              <div>
                <dt className="text-forest/50">Arrival / departure</dt>
                <dd>
                  {booking.policies?.checkInTime ?? "—"} / {booking.policies?.checkOutTime ?? "—"}
                </dd>
              </div>
            </dl>
            {lines.length ? (
              <ul className="space-y-2 border-t border-stone pt-4 text-sm">
                {lines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-4">
                    <span>{line.label}</span>
                    <span>{rupees(line.amountMinor)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {typeof booking.amount?.taxMinor === "number" && booking.amount.taxMinor > 0 ? (
              <p className="flex justify-between text-sm">
                <span>Taxes</span>
                <span>{rupees(booking.amount.taxMinor)}</span>
              </p>
            ) : null}
            {typeof booking.amount?.totalMinor === "number" ? (
              <p className="flex justify-between font-medium">
                <span>Total payable</span>
                <span>{rupees(booking.amount.totalMinor)}</span>
              </p>
            ) : (
              <p className="text-sm text-forest/70">No payable total is stored on this hold.</p>
            )}
            {typeof booking.amount?.dueNowMinor === "number" ? (
              <p className="text-sm text-forest/70">Due now {rupees(booking.amount.dueNowMinor)}</p>
            ) : null}
            {booking.holdExpiresAt ? (
              <p className="rounded-2xl bg-ivory px-4 py-3 text-sm text-forest/80">
                Hold expires {new Date(booking.holdExpiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (Asia/Kolkata).
                After expiry these dates return to the calendar.
              </p>
            ) : null}
            {booking.policies?.accepted ? (
              <p className="text-sm text-forest/70">
                Terms, privacy, and cancellation policies were accepted with this hold.
                {booking.policies.cancellationSummary ? ` ${booking.policies.cancellationSummary}` : null}
              </p>
            ) : null}
            {booking.status === "confirmed" ? (
              <Link href={`/booking/payment-status?reference=${booking.reference}`} className="btn-forest">
                View confirmed reservation
              </Link>
            ) : booking.paymentsConfigured && canRetry ? (
              <button onClick={pay} disabled={paying} className="btn-primary disabled:opacity-60">
                {paying ? "Opening checkout…" : "Proceed to payment"}
              </button>
            ) : booking.paymentsConfigured ? (
              <p className="text-sm text-forest/70">Payment cannot be retried in the current hold state.</p>
            ) : (
              <div className="rounded-2xl border border-stone bg-ivory p-4 text-sm">
                <p className="font-medium text-forest">Payment is not configured</p>
                <p className="mt-2 text-forest/70">
                  Razorpay keys are not present on the server. Checkout stays disabled until RAZORPAY_KEY_ID and
                  RAZORPAY_KEY_SECRET are set server-side.
                </p>
              </div>
            )}
            {payNotice ? <p className="text-sm text-dragon">{payNotice}</p> : null}
          </div>
        ) : (
          <p>Loading reservation…</p>
        )}
      </section>
    </main>
  );
}
