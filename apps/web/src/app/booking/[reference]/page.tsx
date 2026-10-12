"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHero } from "@/components/PageHero";

type Booking = {
  reference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  holdExpiresAt?: string;
  guest: { name: string };
};

export default function BookingDetailPage() {
  const params = useParams<{ reference: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payNotice, setPayNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/bookings/${params.reference}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBooking(data);
      })
      .catch((e) => setError(e.message));
  }, [params.reference]);

  async function pay() {
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
    setPayNotice(`Razorpay order ${data.orderId} created. Complete checkout with the Razorpay widget when the public key is present. A success animation is not confirmation.`);
  }

  return (
    <main>
      <PageHero title="Reservation" body="Payment success on the device is not proof of a booking. Status comes from the server after signature verification." />
      <section className="mx-auto max-w-xl px-4 py-16">
        {error ? <p className="text-dragon">{error}</p> : null}
        {booking ? (
          <div className="space-y-3 rounded-3xl bg-white p-6">
            <p>Reference: {booking.reference}</p>
            <p>Status: {booking.status}</p>
            <p>
              {booking.checkIn} → {booking.checkOut}
            </p>
            <p>Guests: {booking.guests}</p>
            {booking.holdExpiresAt ? <p className="text-sm text-forest/70">Hold expires {booking.holdExpiresAt}</p> : null}
            <button onClick={pay} className="rounded-full bg-dragon px-5 py-2 text-white">
              Create payment order
            </button>
            {payNotice ? <p className="text-sm">{payNotice}</p> : null}
          </div>
        ) : (
          <p>Loading reservation…</p>
        )}
      </section>
    </main>
  );
}
