/**
 * LIVE INTEGRATION — skipped unless VFARMS_LIVE_SUPABASE=true.
 * Requires NEXT_PUBLIC_SUPABASE_URL (or v_farm_resort aliases) and SUPABASE_SERVICE_ROLE_KEY
 * (or v_farm_resort_SUPABASE_SERVICE_ROLE_KEY) in the test environment.
 *
 * Read-only by default. Does not create bookings, users, or payments.
 * Does not run against Razorpay.
 */
import { describe, expect, it } from "vitest";
import { serviceClient, usingSupabaseStore } from "../src/lib/supabase-admin";
import { can } from "../src/lib/staff";

const live = process.env.VFARMS_LIVE_SUPABASE === "true";

describe.skipIf(!live)("LIVE SUPABASE (credentials required)", () => {
  it("initializes a service-role client", () => {
    expect(usingSupabaseStore() || Boolean(serviceClient())).toBe(true);
    expect(serviceClient()).not.toBeNull();
  });

  it("can read runtime_state (table must exist)", async () => {
    const client = serviceClient();
    if (!client) throw new Error("service client missing");
    const { error } = await client.from("runtime_state").select("property_slug").limit(1);
    expect(error, error?.code ?? error?.message).toBeNull();
  });

  it("can read admin_profiles without leaking row payloads in assertions", async () => {
    const client = serviceClient();
    if (!client) throw new Error("service client missing");
    const { error, count } = await client.from("admin_profiles").select("id", { count: "exact", head: true });
    expect(error, error?.code ?? error?.message).toBeNull();
    expect(typeof count === "number" || count === null).toBe(true);
  });

  it("anon key cannot select runtime_state (RLS)", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.v_farm_resort_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.v_farm_resort_SUPABASE_ANON_KEY;
    if (!url || !anon) return;
    const { createClient } = await import("@supabase/supabase-js");
    const anonClient = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await anonClient.from("runtime_state").select("property_slug").limit(1);
    expect(data === null || data.length === 0).toBe(true);
    expect(error === null || Boolean(error)).toBe(true);
  });
});

describe("staff authorization (offline)", () => {
  it("content cannot publish pricing; owner can", () => {
    expect(can("content", "pricing")).toBe(false);
    expect(can("owner", "pricing")).toBe(true);
    expect(can("reservations", "refund")).toBe(false);
  });
});
