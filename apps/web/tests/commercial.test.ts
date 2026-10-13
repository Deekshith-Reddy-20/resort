import { describe, expect, it } from "vitest";
import { emptyCommercial, stayConfigGaps } from "../src/lib/commercial";

describe("stay commercial publish guard", () => {
  it("lists every missing owner field on an empty draft", () => {
    const gaps = stayConfigGaps(emptyCommercial());
    expect(gaps.some((g) => /weekday/i.test(g))).toBe(true);
    expect(gaps.some((g) => /weekend/i.test(g))).toBe(true);
    expect(gaps.some((g) => /tax/i.test(g))).toBe(true);
    expect(gaps.some((g) => /deposit/i.test(g))).toBe(true);
    expect(gaps.some((g) => /capacity/i.test(g))).toBe(true);
    expect(gaps.some((g) => /minimum stay/i.test(g))).toBe(true);
    expect(gaps.some((g) => /maximum stay/i.test(g))).toBe(true);
    expect(gaps.some((g) => /check-in/i.test(g))).toBe(true);
    expect(gaps.some((g) => /check-out/i.test(g))).toBe(true);
    expect(gaps.some((g) => /cancellation/i.test(g))).toBe(true);
    expect(gaps.some((g) => /terms of stay/i.test(g))).toBe(true);
    expect(gaps.some((g) => /privacy/i.test(g))).toBe(true);
  });

  it("accepts a complete owner-approved snapshot", () => {
    expect(
      stayConfigGaps({
        weekdayMinor: 4_500_000,
        weekendMinor: 5_500_000,
        seasonal: [{ startDate: "2026-12-24", endDate: "2026-12-26", nightlyMinor: 7_000_000 }],
        taxBps: 0,
        depositBps: 10000,
        maxGuests: 10,
        minNights: 1,
        maxNights: 7,
        checkInTime: "14:00",
        checkOutTime: "11:00",
        cancellationSummary: "Free cancellation until 7 days before arrival. After that the deposit is retained.",
        termsConfirmed: true,
        privacyConfirmed: true,
        holdMinutes: 15,
        minAdvanceDays: null,
        maxAdvanceDays: null,
        closedToArrival: [],
      }),
    ).toEqual([]);
  });
});
