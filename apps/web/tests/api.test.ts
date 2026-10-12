import { describe, expect, it, beforeEach } from "vitest";
import {
  createEventEnquiry,
  createStayHold,
  resetStore,
  searchAvailability,
  db,
  confirmVerifiedPayment,
  attachOrder,
} from "../src/lib/store";

describe("reservation service", () => {
  beforeEach(() => {
    resetStore();
    const settings = db().settings;
    settings.bookingEnabled = true;
    settings.ratesPublished = true;
    settings.weekdayMinor = 1000000;
    settings.weekendMinor = 1000000;
    settings.maxGuests = 12;
    settings.minNights = 1;
    settings.taxBps = 0;
    settings.depositBps = 10000;
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
