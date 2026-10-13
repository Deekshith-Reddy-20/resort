import { afterEach, describe, expect, it } from "vitest";
import { allowDevPasswordLogin, can, staffAuthMethod, staffConfigured } from "../src/lib/staff";
import { usingSupabaseStore } from "../src/lib/supabase-admin";
import { missingPersistenceEnv, missingStaffAuthEnv, persistenceMessage } from "../src/lib/hosted-config";
import { applyRazorpayWebhook, attachOrder, createStayHold, db, publishStayConfig, resetStore } from "../src/lib/store";

const saved: Record<string, string | undefined> = {};

function setEnv(key: string, value: string | undefined) {
  if (!(key in saved)) saved[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    delete saved[key];
  }
});

describe("staff authentication configuration", () => {
  it("never enables development password login on Vercel", () => {
    setEnv("VERCEL", "1");
    setEnv("NODE_ENV", "development");
    setEnv("STAFF_ALLOW_DEV_PASSWORD", "true");
    setEnv("STAFF_SESSION_SECRET", "test-session-secret-value");
    setEnv("STAFF_DEV_EMAIL", "owner@example.com");
    setEnv("STAFF_DEV_PASSWORD", "not-a-production-password");
    expect(allowDevPasswordLogin()).toBe(false);
  });

  it("never enables development password login in production", () => {
    setEnv("VERCEL", undefined);
    setEnv("NODE_ENV", "production");
    setEnv("STAFF_ALLOW_DEV_PASSWORD", "true");
    setEnv("STAFF_SESSION_SECRET", "test-session-secret-value");
    setEnv("STAFF_DEV_EMAIL", "owner@example.com");
    setEnv("STAFF_DEV_PASSWORD", "not-a-production-password");
    expect(allowDevPasswordLogin()).toBe(false);
  });

  it("reports none when the session secret is missing", () => {
    setEnv("VERCEL", "1");
    setEnv("NODE_ENV", "production");
    setEnv("STAFF_SESSION_SECRET", "");
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(staffAuthMethod()).toBe("none");
    expect(staffConfigured()).toBe(false);
  });

  it("A02 unauthorized roles cannot mutate pricing or refunds", () => {
    expect(can("content", "pricing")).toBe(false);
    expect(can("reservations", "refund")).toBe(false);
    expect(can("operations", "pricing")).toBe(false);
  });
});

describe("supabase persistence mode", () => {
  it("stays on memory unless DATABASE_MODE=supabase or Vercel plus service role", () => {
    setEnv("DATABASE_MODE", "memory");
    setEnv("VERCEL", "1");
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    setEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    expect(usingSupabaseStore()).toBe(false);
  });

  it("lists canonical missing env names without values on Vercel", () => {
    setEnv("VERCEL", "1");
    setEnv("DATABASE_MODE", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    setEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    setEnv("STAFF_SESSION_SECRET", "");
    setEnv("v_farm_resort_SUPABASE_URL", "");
    setEnv("v_farm_resort_SUPABASE_ANON_KEY", "");
    setEnv("v_farm_resort_SUPABASE_SERVICE_ROLE_KEY", "");
    setEnv("NEXT_PUBLIC_v_farm_resort_SUPABASE_URL", "");
    setEnv("NEXT_PUBLIC_v_farm_resort_SUPABASE_ANON_KEY", "");
    expect(missingStaffAuthEnv()).toEqual([
      "STAFF_SESSION_SECRET",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
    expect(missingPersistenceEnv()).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(persistenceMessage()?.includes("NEXT_PUBLIC_SUPABASE_URL")).toBe(true);
    expect(persistenceMessage()?.toLowerCase().includes("service_role")).toBe(true);
  });

  it("does not report a persistence blocker when Vercel has supabase keys and mode", () => {
    setEnv("VERCEL", "1");
    setEnv("DATABASE_MODE", "supabase");
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    setEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    expect(missingPersistenceEnv()).toEqual([]);
    expect(persistenceMessage()).toBeNull();
  });

  it("accepts Vercel Supabase integration aliases", () => {
    setEnv("DATABASE_MODE", "supabase");
    setEnv("VERCEL", "1");
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    setEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    setEnv("v_farm_resort_SUPABASE_URL", "https://example.supabase.co");
    setEnv("v_farm_resort_SUPABASE_SERVICE_ROLE_KEY", "service");
    expect(usingSupabaseStore()).toBe(true);
    expect(missingPersistenceEnv()).toEqual([]);
  });

  it("enables supabase when DATABASE_MODE=supabase and keys exist", () => {
    setEnv("DATABASE_MODE", "supabase");
    setEnv("VERCEL", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    setEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    expect(usingSupabaseStore()).toBe(true);
  });
});

describe("payment webhook persistence helpers", () => {
  it("treats a duplicate Razorpay event as idempotent", async () => {
    resetStore();
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
    expect(publishStayConfig("test").ok).toBe(true);
    const hold = await createStayHold({
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      guests: 2,
      fullName: "A",
      email: "a@example.com",
      phone: "1111111111",
      acceptPolicies: true,
    });
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;
    await attachOrder({ stayReference: hold.booking.reference, orderId: "order_dup", amountMinor: 2_000_000 });
    const first = await applyRazorpayWebhook({
      eventId: "evt_1",
      event: "payment.captured",
      paymentId: "pay_dup",
      orderId: "order_dup",
    });
    const second = await applyRazorpayWebhook({
      eventId: "evt_1",
      event: "payment.captured",
      paymentId: "pay_dup",
      orderId: "order_dup",
    });
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(db().stays[0].status).toBe("confirmed");
  });
});
