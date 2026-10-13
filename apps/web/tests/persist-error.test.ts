import { afterEach, describe, expect, it } from "vitest";
import { persistCatch } from "../src/lib/http";
import { PersistError, classifyPersistError } from "../src/lib/persist-error";
import { searchAvailability } from "../src/lib/store";

describe("inventory persist error classification", () => {
  it("maps PGRST205 to a missing-table message without leaking internals", () => {
    const failure = classifyPersistError("runtime_state.pull", { code: "PGRST205", message: "Could not find the table 'public.runtime_state' in the schema cache" });
    expect(failure.reason).toBe("missing_table");
    expect(failure.code).toBe("PGRST205");
    expect(failure.message).toContain("runtime_state");
    expect(failure.message.toLowerCase()).not.toContain("schema cache");
  });

  it("maps 42P01 the same way", () => {
    expect(classifyPersistError("runtime_state.pull", { code: "42P01" }).reason).toBe("missing_table");
  });

  it("maps JWT failures to invalid credentials", () => {
    expect(classifyPersistError("runtime_state.pull", { code: "401", message: "Invalid API key" }).reason).toBe("invalid_credentials");
  });

  it("maps RLS/permission codes", () => {
    expect(classifyPersistError("runtime_state.pull", { code: "42501", message: "permission denied" }).reason).toBe("permission");
  });

  it("maps connectivity failures", () => {
    expect(classifyPersistError("runtime_state.pull", { message: "fetch failed ECONNREFUSED" }).reason).toBe("connectivity");
  });

  it("maps PersistError to HTTP 503 with sanitized persistFailure", () => {
    const res = persistCatch(
      new PersistError(classifyPersistError("runtime_state.pull", { code: "PGRST205", message: "schema cache" })),
    );
    expect(res.status).toBe(503);
  });
});

describe("hosted availability without persistence", () => {
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

  it("never reports dates available on Vercel when DATABASE_MODE=memory", async () => {
    setEnv("VERCEL", "1");
    setEnv("DATABASE_MODE", "memory");
    const result = await searchAvailability({ product: "stay", startDate: "2026-12-01", endDate: "2026-12-03" });
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/persistence|DATABASE_MODE/i);
  });
});
