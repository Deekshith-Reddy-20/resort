import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment status" };

export default function PaymentStatusPage() {
  return (
    <main>
      <PageHero
        title="Payment status"
        body="This page does not confirm a reservation. Use your booking reference to check server-verified status. Uncertain payments remain pending until a verified Razorpay event is processed."
      />
      <section className="mx-auto max-w-xl px-4 py-16">
        <Link href="/booking" className="text-dragon">
          Look up a reservation
        </Link>
      </section>
    </main>
  );
}
