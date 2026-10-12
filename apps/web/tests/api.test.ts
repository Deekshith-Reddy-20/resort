import { describe, expect, it, beforeEach } from "vitest";
import {
  createEventEnquiry,
  createStayHold,
  createStayQuote,
  resetStore,
  searchAvailability,
  db,
  confirmVerifiedPayment,
  attachOrder,
  publishStayConfig,
  preparePayment,
  rememberWebhook,
  markPaymentFailed,
} from "../src/lib/store";

function publishTestRates() {
  db().settings.draft = {
    weekdayMinor: 1_000_000,
    weekendMinor: 1_000_000,
    seasonal: [],
    taxBps: 0,
    depositBps: 10000,
    maxGuests: 12,
    minNights: 1,
    maxNights: 14,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    cancellationSummary: "Free cancellation until 7 days before arrival. After that the deposit is retained.",
    termsConfirmed: true,
    privacyConfirmed: true,
    holdMinutes: 15,
  };
  const published = publishStayConfig("test");
  if (!published.ok) throw new Error(published.error);
}

describe("reservation service", () => {
  beforeEach(() => {
    resetStore();
    publishTestRates();
  });

  it("G03 concurrent holds: second overlapping hold is rejected", async () => {
    const guest = {
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 4,
      fullName: "Test Guest",
      email: "a@example.com",
      phone: "9999999999",
      acceptPolicies: true as const,
    };
    const first = await createStayHold(guest);
    expect(first.ok).toBe(true);
    const second = await createStayHold({ ...guest, email: "b@example.com" });
    expect(second.ok).toBe(false);
  });

  it("G08 enquiry does not occupy inventory", async () => {
    await createEventEnquiry({
      fullName: "Organiser",
      email: "org@example.com",
      phone: "8888888888",
      eventType: "Gathering",
      startDate: "2026-12-01",
      endDate: "2026-12-01",
    });
    const search = await searchAvailability({
      product: "stay",
      startDate: "2026-12-01",
      endDate: "2026-12-03",
    });
    expect(search.available).toBe(true);
  });

  it("P02 client success without verify does not confirm", async () => {
    const hold = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 2,
      fullName: "Test Guest",
      email: "a@example.com",
      phone: "9999999999",
      acceptPolicies: true,
    });
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;
    expect(db().stays[0].status).not.toBe("confirmed");
  });

  it("refuses a hold and lists missing settings when unpublished", async () => {
    resetStore();
    const blocked = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 2,
      fullName: "Test Guest",
      email: "a@example.com",
      phone: "9999999999",
      acceptPolicies: true,
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.missingSettings?.length).toBeGreaterThan(3);
    const quote = await createStayQuote({ checkIn: "2026-11-20", checkOut: "2026-11-22", guests: 2 });
    expect(quote.totalMinor).toBeNull();
    expect(quote.bookingEnabled).toBe(false);
  });

  it("rejects guest counts above published capacity", async () => {
    const hold = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 20,
      fullName: "Test Guest",
      email: "a@example.com",
      phone: "9999999999",
      acceptPolicies: true,
    });
    expect(hold.ok).toBe(false);
  });

  it("reports occupied dates as unavailable rather than unpublished", async () => {
    const first = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 2,
      fullName: "Test Guest",
      email: "a@example.com",
      phone: "9999999999",
      acceptPolicies: true,
    });
    expect(first.ok).toBe(true);
    const quote = await createStayQuote({ checkIn: "2026-11-20", checkOut: "2026-11-22", guests: 2 });
    expect(quote.bookingEnabled).toBe(true);
    expect(quote.available).toBe(false);
    expect(quote.blockCode).toBe("unavailable");
    expect(quote.blockMessage).toMatch(/reserved/i);
    expect(quote.missingSettings).toEqual([]);
  });

  it("publishes a complete draft then creates a priced hold", async () => {
    const quote = await createStayQuote({ checkIn: "2026-11-20", checkOut: "2026-11-22", guests: 2 });
    expect(quote.bookingEnabled).toBe(true);
    expect(quote.totalMinor).toBe(2_000_000);
    const hold = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 2,
      fullName: "Test Guest",
      email: "a@example.com",
      phone: "9999999999",
      acceptPolicies: true,
    });
    expect(hold.ok).toBe(true);
  });

  it("does not prepare payment after the hold expires", async () => {
    const hold = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 2,
      fullName: "Test Guest",
      email: "a@example.com",
      phone: "9999999999",
      acceptPolicies: true,
    });
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;
    db().holds[0].expiresAt = new Date(Date.now() - 1000).toISOString();
    const prepared = preparePayment({ stayReference: hold.booking.reference });
    expect(prepared.ok).toBe(false);
  });

  it("reuses a pending Razorpay order for repeated clicks", async () => {
    const hold = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 2,
      fullName: "Test Guest",
      email: "a@example.com",
      phone: "9999999999",
      acceptPolicies: true,
    });
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;
    await attachOrder({ stayReference: hold.booking.reference, orderId: "order_repeat", amountMinor: 2_000_000 });
    const prepared = preparePayment({ stayReference: hold.booking.reference });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.existingOrderId).toBe("order_repeat");
    expect(prepared.amountMinor).toBe(2_000_000);
  });

  it("records failed payments without confirming the stay", async () => {
    const hold = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 2,
      fullName: "Test Guest",
      email: "a@example.com",
      phone: "9999999999",
      acceptPolicies: true,
    });
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;
    await attachOrder({ stayReference: hold.booking.reference, orderId: "order_fail", amountMinor: 2_000_000 });
    markPaymentFailed("order_fail", "pay_fail");
    expect(db().payments[0].status).toBe("failed");
    expect(db().stays[0].status).not.toBe("confirmed");
  });

  it("treats duplicate webhook ids as already seen", () => {
    expect(rememberWebhook("evt_1")).toBe(true);
    expect(rememberWebhook("evt_1")).toBe(false);
  });

  it("INV-07 expired hold plus later occupancy yields paid-unbooked", async () => {
    const first = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 2,
      fullName: "A",
      email: "a@example.com",
      phone: "1111111111",
      acceptPolicies: true,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const stay = db().stays[0];
    const hold = db().holds[0];
    hold.expiresAt = new Date(Date.now() - 60_000).toISOString();
    stay.status = "expired";
    const second = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 2,
      fullName: "B",
      email: "b@example.com",
      phone: "2222222222",
      acceptPolicies: true,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    db().stays.find((s) => s.reference === second.booking.reference)!.status = "confirmed";
    db().holds = db().holds.filter((h) => h.stayId !== db().stays.find((s) => s.reference === second.booking.reference)?.id);
    await attachOrder({ stayReference: first.booking.reference, orderId: "order_old", amountMinor: 1 });
    const result = await confirmVerifiedPayment({ orderId: "order_old", paymentId: "pay_old" });
    expect(result.status).toBe("paid_unbooked");
  });
});
