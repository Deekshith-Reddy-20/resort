import { describe, expect, it } from "vitest";
import {
  eventConflictsStay,
  findConflicts,
  stayConflictsStay,
} from "../src/conflicts";
import { canAllocate, resolveLatePayment, type InventorySnapshot } from "../src/engine";
import { quoteStay } from "../src/pricing";

const empty: InventorySnapshot = {
  stays: [],
  events: [],
  holds: [],
  maintenance: [],
  nowIso: "2026-10-12T06:00:00.000Z",
};

describe("G03-G10 inventory policy", () => {
  it("G04 rejects overlapping stays on booked nights", () => {
    expect(
      stayConflictsStay(
        { checkIn: "2026-11-06", checkOut: "2026-11-08" },
        { checkIn: "2026-11-07", checkOut: "2026-11-09" },
      ),
    ).toBe(true);
  });

  it("G05 allows back-to-back stays sharing checkout/check-in", () => {
    expect(
      stayConflictsStay(
        { checkIn: "2026-11-06", checkOut: "2026-11-07" },
        { checkIn: "2026-11-07", checkOut: "2026-11-08" },
      ),
    ).toBe(false);
  });

  it("G06 rejects an event on a stay arrival or departure date", () => {
    expect(
      eventConflictsStay(
        { startDate: "2026-11-07", endDate: "2026-11-07" },
        { checkIn: "2026-11-06", checkOut: "2026-11-07" },
      ),
    ).toBe(true);
    expect(
      eventConflictsStay(
        { startDate: "2026-11-06", endDate: "2026-11-06" },
        { checkIn: "2026-11-06", checkOut: "2026-11-07" },
      ),
    ).toBe(true);
  });

  it("G07 rejects a multi-day event overlapping a stay", () => {
    const result = findConflicts(
      { kind: "event", startDate: "2026-11-06", endDate: "2026-11-08" },
      [{ kind: "stay", startDate: "2026-11-07", endDate: "2026-11-09" }],
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe("EVENT_STAY_OVERLAP");
  });

  it("G03 only one active hold can occupy the same nights", () => {
    const snapshot: InventorySnapshot = {
      ...empty,
      holds: [
        {
          id: "h1",
          propertyId: "p",
          kind: "stay",
          startDate: "2026-11-06",
          endDate: "2026-11-08",
          expiresAt: "2026-10-12T07:00:00.000Z",
          reference: "VF-STAY-AAAAAA",
        },
      ],
    };
    const second = canAllocate(
      { kind: "stay", startDate: "2026-11-06", endDate: "2026-11-08" },
      snapshot,
      "p",
    );
    expect(second.ok).toBe(false);
  });

  it("G10 expired holds release inventory", () => {
    const snapshot: InventorySnapshot = {
      ...empty,
      holds: [
        {
          id: "h1",
          propertyId: "p",
          kind: "stay",
          startDate: "2026-11-06",
          endDate: "2026-11-08",
          expiresAt: "2026-10-12T05:00:00.000Z",
          reference: "VF-STAY-AAAAAA",
        },
      ],
    };
    const next = canAllocate(
      { kind: "stay", startDate: "2026-11-06", endDate: "2026-11-08" },
      snapshot,
      "p",
    );
    expect(next.ok).toBe(true);
  });

  it("INV-07 late payment after resale becomes paid-unbooked", () => {
    const hold = {
      id: "h1",
      propertyId: "p",
      kind: "stay" as const,
      startDate: "2026-11-06",
      endDate: "2026-11-08",
      expiresAt: "2026-10-12T05:00:00.000Z",
      reference: "VF-STAY-OLD",
    };
    const snapshot: InventorySnapshot = {
      ...empty,
      stays: [
        {
          id: "s2",
          propertyId: "p",
          checkIn: "2026-11-06",
          checkOut: "2026-11-08",
          status: "confirmed",
        },
      ],
    };
    expect(
      resolveLatePayment({
        hold,
        snapshot,
        propertyId: "p",
        proposed: { kind: "stay", startDate: "2026-11-06", endDate: "2026-11-08" },
        nowIso: "2026-10-12T06:30:00.000Z",
      }),
    ).toBe("paid_unbooked");
  });

  it("G08 unapproved enquiries are not inventory occupancy", () => {
    const snapshot = empty;
    const result = canAllocate(
      { kind: "event", startDate: "2026-12-01", endDate: "2026-12-01" },
      snapshot,
      "p",
    );
    expect(result.ok).toBe(true);
  });

  it("G13 maintenance blocks stays and events", () => {
    const snapshot: InventorySnapshot = {
      ...empty,
      maintenance: [{ id: "m1", propertyId: "p", startDate: "2026-11-10", endDate: "2026-11-12" }],
    };
    expect(
      canAllocate({ kind: "stay", startDate: "2026-11-11", endDate: "2026-11-13" }, snapshot, "p").ok,
    ).toBe(false);
    expect(
      canAllocate({ kind: "event", startDate: "2026-11-12", endDate: "2026-11-12" }, snapshot, "p").ok,
    ).toBe(false);
  });
});

describe("pricing unpublished by default", () => {
  it("does not invent a stay total when rates are unpublished", () => {
    const quote = quoteStay({
      checkIn: "2026-11-06",
      checkOut: "2026-11-08",
      guests: 4,
      bookingEnabled: false,
      ratePlan: {
        currency: "INR",
        weekdayMinor: null,
        weekendMinor: null,
        published: false,
        minNights: null,
        maxNights: null,
        maxGuests: null,
        taxBps: null,
        depositBps: null,
        weekendWeekdays: [0, 6],
      },
    });
    expect(quote.totalMinor).toBeNull();
    expect(quote.bookingEnabled).toBe(false);
  });

  it("G11 rejects guest counts above configured capacity once published", () => {
    const quote = quoteStay({
      checkIn: "2026-11-06",
      checkOut: "2026-11-08",
      guests: 20,
      bookingEnabled: true,
      ratePlan: {
        currency: "INR",
        weekdayMinor: 5000000,
        weekendMinor: 7000000,
        published: true,
        minNights: 1,
        maxNights: 7,
        maxGuests: 12,
        taxBps: 0,
        depositBps: 10000,
        weekendWeekdays: [0, 6],
      },
    });
    expect(quote.available).toBe(false);
    expect(quote.reason).toMatch(/capacity/i);
  });

  it("does not mark unpublished rates as available", () => {
    const quote = quoteStay({
      checkIn: "2026-11-06",
      checkOut: "2026-11-08",
      guests: 2,
      bookingEnabled: false,
      ratePlan: {
        currency: "INR",
        weekdayMinor: null,
        weekendMinor: null,
        published: false,
        minNights: null,
        maxNights: null,
        maxGuests: null,
        taxBps: null,
        depositBps: null,
        weekendWeekdays: [0, 6],
      },
    });
    expect(quote.available).toBe(false);
    expect(quote.bookingEnabled).toBe(false);
  });

  it("G14 prices each night from the matching seasonal exception", () => {
    const quote = quoteStay({
      checkIn: "2026-12-24",
      checkOut: "2026-12-26",
      guests: 2,
      bookingEnabled: true,
      ratePlan: {
        currency: "INR",
        weekdayMinor: 1_000_000,
        weekendMinor: 1_000_000,
        published: true,
        minNights: 1,
        maxNights: 14,
        maxGuests: 12,
        taxBps: 0,
        depositBps: 10000,
        weekendWeekdays: [0, 6],
      },
      exceptions: [{ startDate: "2026-12-25", endDate: "2026-12-25", nightlyMinor: 3_000_000 }],
    });
    expect(quote.nightly[0].amountMinor).toBe(1_000_000);
    expect(quote.nightly[1].kind).toBe("seasonal");
    expect(quote.nightly[1].amountMinor).toBe(3_000_000);
    expect(quote.totalMinor).toBe(4_000_000);
  });
});
