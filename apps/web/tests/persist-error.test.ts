import { describe, expect, it } from "vitest";
import { classifyPersistError } from "../src/lib/persist-error";

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
});
