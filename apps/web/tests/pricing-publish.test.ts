import { beforeEach, describe, expect, it } from "vitest";
import { can } from "../src/lib/staff";
import { stayConfigGaps, type CommercialSettings } from "../src/lib/commercial";
import {
  commercialState,
  createStayHold,
  createStayQuote,
  hydrateFromPayload,
  publicConfig,
  publishStayConfig,
  resetStore,
  serializeStore,
  unpublishStayConfig,
  updateDraftSettings,
} from "../src/lib/store";

function completeDraft(overrides: Partial<CommercialSettings> = {}): CommercialSettings {
  return {
    weekdayMinor: 1_000_000,
    weekendMinor: 1_200_000,
    seasonal: [],
    taxBps: 0,
    depositBps: 10000,
    maxGuests: 8,
    minNights: 1,
    maxNights: 7,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    cancellationSummary: "Test-only cancellation text that exceeds twenty characters.",
    termsConfirmed: true,
    privacyConfirmed: true,
    holdMinutes: 15,
    minAdvanceDays: null,
    maxAdvanceDays: null,
    closedToArrival: [],
    ...overrides,
  };
}

describe("pricing draft, publish, and public visibility", () => {
  beforeEach(() => {
    resetStore();
  });

  it("rejects an incomplete draft at publish and keeps checkout off", () => {
    updateDraftSettings({ weekdayMinor: 1_000_000 }, "owner");
    const result = publishStayConfig("owner");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missingSettings.length).toBeGreaterThan(0);
    expect(stayConfigGaps(commercialState().draft).length).toBeGreaterThan(0);
    expect(publicConfig().bookingEnabled).toBe(false);
    expect(publicConfig().maxGuests).toBeNull();
    expect(publicConfig().missingSettings[0]).toMatch(/not published/i);
  });

  it("saves a draft without enabling public booking", () => {
    const saved = updateDraftSettings(completeDraft(), "owner");
    expect(saved.live).toBe(false);
    expect(saved.draft.maxGuests).toBe(8);
    expect(saved.draftGaps).toEqual([]);
    expect(publicConfig().bookingEnabled).toBe(false);
    expect(publicConfig().ratesPublished).toBe(false);
    expect(publicConfig().maxGuests).toBeNull();
  });

  it("reloads the draft after a serialize/hydrate round-trip without publishing", () => {
    updateDraftSettings(completeDraft({ maxGuests: 6, weekdayMinor: 2_000_000 }), "owner");
    const payload = serializeStore();
    resetStore();
    expect(commercialState().draft.maxGuests).toBeNull();
    hydrateFromPayload(payload);
    expect(commercialState().draft.maxGuests).toBe(6);
    expect(commercialState().draft.weekdayMinor).toBe(2_000_000);
    expect(commercialState().live).toBe(false);
    expect(publicConfig().bookingEnabled).toBe(false);
  });

  it("publishes a complete draft and exposes it on the public config and quote", async () => {
    updateDraftSettings(completeDraft({ maxGuests: 9 }), "owner");
    const published = publishStayConfig("owner");
    expect(published.ok).toBe(true);
    const cfg = publicConfig();
    expect(cfg.bookingEnabled).toBe(true);
    expect(cfg.ratesPublished).toBe(true);
    expect(cfg.maxGuests).toBe(9);
    expect(cfg.missingSettings).toEqual([]);
    const quote = await createStayQuote({ checkIn: "2026-12-01", checkOut: "2026-12-03", guests: 2 });
    expect(quote.bookingEnabled).toBe(true);
    expect(quote.available).toBe(true);
    expect(quote.totalMinor).toBeGreaterThan(0);
    expect(quote.blockCode).toBe("none");
  });

  it("keeps public booking on the published snapshot when the draft later changes", async () => {
    updateDraftSettings(completeDraft({ maxGuests: 8, weekdayMinor: 1_000_000 }), "owner");
    expect(publishStayConfig("owner").ok).toBe(true);
    updateDraftSettings({ maxGuests: 20, weekdayMinor: 9_000_000 }, "owner");
    expect(publicConfig().maxGuests).toBe(8);
    expect(publicConfig().bookingEnabled).toBe(true);
    const quote = await createStayQuote({ checkIn: "2026-12-01", checkOut: "2026-12-03", guests: 2 });
    expect(quote.totalMinor).not.toBeNull();
    expect(commercialState().draft.maxGuests).toBe(20);
  });

  it("unpublishes and turns public checkout off without deleting the draft", () => {
    updateDraftSettings(completeDraft(), "owner");
    expect(publishStayConfig("owner").ok).toBe(true);
    unpublishStayConfig("owner");
    expect(publicConfig().bookingEnabled).toBe(false);
    expect(publicConfig().maxGuests).toBeNull();
    expect(commercialState().draft.maxGuests).toBe(8);
  });

  it("blocks holds while unpublished even if the draft is complete", async () => {
    updateDraftSettings(completeDraft(), "owner");
    const hold = await createStayHold({
      checkIn: "2026-12-01",
      checkOut: "2026-12-03",
      guests: 2,
      fullName: "Guest",
      email: "guest@example.com",
      phone: "9999999999",
      acceptPolicies: true,
    });
    expect(hold.ok).toBe(false);
    if (hold.ok) return;
    expect(hold.error).toMatch(/not published/i);
  });

  it("does not treat five rooms as separately bookable after publish", async () => {
    updateDraftSettings(completeDraft(), "owner");
    expect(publishStayConfig("owner").ok).toBe(true);
    const first = await createStayHold({
      checkIn: "2026-12-01",
      checkOut: "2026-12-03",
      guests: 2,
      fullName: "Guest",
      email: "guest@example.com",
      phone: "9999999999",
      acceptPolicies: true,
    });
    expect(first.ok).toBe(true);
    const second = await createStayHold({
      checkIn: "2026-12-02",
      checkOut: "2026-12-04",
      guests: 2,
      fullName: "Other",
      email: "other@example.com",
      phone: "8888888888",
      acceptPolicies: true,
    });
    expect(second.ok).toBe(false);
  });
});

describe("pricing publication authorization", () => {
  it("allows only owner and admin to mutate pricing", () => {
    expect(can("owner", "pricing")).toBe(true);
    expect(can("admin", "pricing")).toBe(true);
    expect(can("content", "pricing")).toBe(false);
    expect(can("reservations", "pricing")).toBe(false);
    expect(can("operations", "pricing")).toBe(false);
  });
});
