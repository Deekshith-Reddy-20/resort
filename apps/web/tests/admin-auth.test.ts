import { describe, expect, it, beforeEach } from "vitest";
import { can } from "../src/lib/staff";
import {
  adminOverview,
  createEventEnquiry,
  recordRefund,
  resetStore,
  reviewEnquiry,
  updateCms,
  db,
  attachOrder,
  createStayHold,
  publishStayConfig,
  propertyMonth,
  recordOfflinePayment,
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
    cancellationSummary: "Owner published cancellation draft for tests.",
    termsConfirmed: true,
    privacyConfirmed: true,
    holdMinutes: 15,
  };
  const published = publishStayConfig("test");
  if (!published.ok) throw new Error(published.error);
}

describe("A01-A02 staff authorization", () => {
  it("A02 content role cannot refund or publish prices", () => {
    expect(can("content", "refund")).toBe(false);
    expect(can("content", "pricing")).toBe(false);
    expect(can("content", "content")).toBe(true);
    expect(can("reservations", "refund")).toBe(false);
    expect(can("owner", "refund")).toBe(true);
    expect(can("operations", "audit")).toBe(false);
    expect(can("reservations", "pricing")).toBe(false);
    expect(can("content", "ops")).toBe(false);
  });
});

describe("admin operations against inventory", () => {
  beforeEach(() => {
    resetStore();
    publishTestRates();
  });

  it("reviewing an enquiry does not create a hold", async () => {
    const created = await createEventEnquiry({
      fullName: "Organiser",
      email: "org@example.com",
      phone: "8888888888",
      eventType: "Gathering",
      startDate: "2026-12-01",
      endDate: "2026-12-01",
    });
    const reviewed = reviewEnquiry(created.reference, "review", "owner@test");
    expect(reviewed.ok).toBe(true);
    expect(db().holds).toHaveLength(0);
  });

  it("unpublished CMS contact stays off the public record", () => {
    updateCms({ contactPhone: "9999999999", published: false }, "content");
    expect(db().cms.published).toBe(false);
  });

  it("does not record a refund against an uncaptured payment", async () => {
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
    await attachOrder({ stayReference: hold.booking.reference, orderId: "order_open", amountMinor: 2_000_000 });
    const denied = recordRefund({ paymentId: "order_open", amountMinor: 100, reason: "test", actor: "owner" });
    expect(denied.ok).toBe(false);
  });

  it("survives a store created before CMS fields existed", () => {
    delete (db() as { notifications?: unknown }).notifications;
    const overview = adminOverview();
    expect(overview.notifications).toEqual([]);
    expect(overview.arrivalsToday).toBe(0);
  });

  it("marks occupied stay nights unavailable and checkout available when free", async () => {
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
    const month = propertyMonth(2026, 10);
    const occupied = month.days.find((d) => d.date === "2026-11-20");
    const checkout = month.days.find((d) => d.date === "2026-11-22");
    expect(occupied?.tone === "unavailable" || occupied?.tone === "hold").toBe(true);
    expect(checkout?.tone === "available" || checkout?.tone === "unconfigured").toBe(true);
  });

  it("does not treat an unapproved enquiry as unavailable", async () => {
    await createEventEnquiry({
      fullName: "Organiser",
      email: "org@example.com",
      phone: "8888888888",
      eventType: "Gathering",
      startDate: "2026-12-04",
      endDate: "2026-12-04",
    });
    const month = propertyMonth(2026, 11);
    const day = month.days.find((d) => d.date === "2026-12-04");
    expect(day?.tone).not.toBe("unavailable");
    expect(day?.pendingEnquiry).toBe(true);
  });

  it("logs offline payment without confirming inventory", async () => {
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
    const logged = recordOfflinePayment({
      reference: hold.booking.reference,
      amountMinor: 50000,
      method: "cash",
      note: "partial",
      actor: "owner",
    });
    expect(logged.ok).toBe(true);
    expect(db().stays.find((s) => s.reference === hold.booking.reference)?.status).not.toBe("confirmed");
    const overview = adminOverview();
    expect(overview.reports.capturedRevenueMinor).toBe(0);
    expect(overview.offlinePayments).toHaveLength(1);
  });
});
