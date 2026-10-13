"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHero } from "@/components/PageHero";

type Status = {
  reference: string;
  kind?: string;
  paymentStatus: string;
  reservationStatus: string;
  exception: string | null;
};

function StatusBody() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? "";
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) return;
    fetch(`/api/payments/${encodeURIComponent(reference)}/status`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load payment status.");
        setStatus(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Status lookup failed."));
  }, [reference]);

  const confirmed = status?.reservationStatus === "confirmed" && status.paymentStatus === "captured";

  return (
    <section className="mx-auto max-w-xl px-4 py-16">
      {!reference ? <p>Add a booking reference to check server-verified status.</p> : null}
      {error ? <p className="text-dragon">{error}</p> : null}
      {status ? (
        <div className="space-y-4 rounded-3xl bg-white p-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-dragon">{status.reference}</p>
          {confirmed ? (
            <>
              <h2 className="font-serif text-3xl text-forest">Reservation confirmed</h2>
              <p>The server verified the Razorpay payment and allocated the whole property.</p>
            </>
          ) : status.exception === "PAID_UNBOOKED" ? (
            <>
              <h2 className="font-serif text-3xl text-forest">Payment received, dates not held</h2>
              <p>
                Payment was verified after the hold expired or the dates were taken. Operations has an exception. This is not a
                confirmed stay.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-3xl text-forest">Not confirmed yet</h2>
              <p>
                Reservation status: {status.reservationStatus}. Payment status: {status.paymentStatus}. A Checkout success
                screen is not confirmation.
              </p>
              <Link
                href={status.kind === "event" || status.reference.startsWith("VF-QTE") ? `/events/quotes/${status.reference}` : `/booking/${status.reference}`}
                className="btn-primary"
              >
                Return to hold
              </Link>
            </>
          )}
        </div>
      ) : null}
      <Link href="/booking" className="mt-6 inline-block text-dragon">
        Look up a reservation
      </Link>
    </section>
  );
}

export default function PaymentStatusPage() {
  return (
    <main>
      <PageHero
        title="Payment status"
        body="This page confirms a stay only after server-side signature verification and inventory allocation."
      />
      <Suspense fallback={<p className="p-10">Loading status…</p>}>
        <StatusBody />
      </Suspense>
    </main>
  );
}
