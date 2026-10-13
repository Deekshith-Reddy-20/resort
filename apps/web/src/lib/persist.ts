import { withLock as mutexLock } from "./mutex";
import { PersistError, classifyPersistError, type PersistFailure } from "./persist-error";
import { serviceClient, usingSupabaseStore } from "./supabase-admin";

const PROPERTY = process.env.PROPERTY_ID ?? "vfarms-hyderabad";

type StoreIo = {
  serialize: () => Record<string, unknown>;
  hydrate: (payload: unknown) => void;
};

let io: StoreIo | null = null;
let lastFailure: PersistFailure | null = null;

export function registerStoreIo(next: StoreIo) {
  io = next;
}

export function persistEnabled() {
  return usingSupabaseStore();
}

export function lastPersistFailure() {
  return lastFailure;
}

function logFailure(failure: PersistFailure) {
  lastFailure = failure;
  console.error("inventory persist failed", failure.operation, failure.code ?? "none", failure.reason);
}

function emptyRow(error: { code?: string } | null) {
  return error?.code === "PGRST116";
}

export async function pullStore() {
  lastFailure = null;
  if (!persistEnabled() || !io) return true;
  const client = serviceClient();
  if (!client) {
    const failure: PersistFailure = {
      operation: "runtime_state.pull",
      code: null,
      reason: "missing_config",
      message: "Inventory persistence is not configured on the server.",
    };
    logFailure(failure);
    return false;
  }
  const { data, error } = await client.from("runtime_state").select("payload").eq("property_slug", PROPERTY).limit(1);
  if (error && !emptyRow(error)) {
    logFailure(classifyPersistError("runtime_state.pull", error));
    return false;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.payload && typeof row.payload === "object") {
    try {
      io.hydrate(row.payload);
    } catch {
      logFailure(classifyPersistError("runtime_state.hydrate", { message: "invalid payload", code: "invalid_payload" }));
      return false;
    }
  }
  return true;
}

export async function pushStore() {
  if (!persistEnabled() || !io) return true;
  const client = serviceClient();
  if (!client) {
    logFailure(classifyPersistError("runtime_state.push", { message: "service client missing", code: "missing_config" }));
    return false;
  }
  const payload = io.serialize();
  const rpc = await client.rpc("upsert_runtime_state", { p_slug: PROPERTY, p_payload: payload });
  if (!rpc.error) return true;
  const rpcMissing =
    rpc.error.code === "PGRST202" || /could not find the function|schema cache/i.test(rpc.error.message ?? "");
  if (!rpcMissing) {
    logFailure(classifyPersistError("runtime_state.push", rpc.error));
    return false;
  }
  const { error } = await client.from("runtime_state").upsert(
    { property_slug: PROPERTY, payload, updated_at: new Date().toISOString() },
    { onConflict: "property_slug" },
  );
  if (error) {
    logFailure(classifyPersistError("runtime_state.push", error));
    return false;
  }
  return true;
}

export { PersistError };

export async function withStore<T>(fn: () => T | Promise<T>): Promise<T> {
  if (!persistEnabled()) return await fn();
  return mutexLock(PROPERTY, async () => {
    const loaded = await pullStore();
    if (!loaded) throw new PersistError(lastFailure ?? classifyPersistError("runtime_state.pull", null));
    const result = await fn();
    const saved = await pushStore();
    if (!saved) throw new PersistError(lastFailure ?? classifyPersistError("runtime_state.push", null));
    return result;
  });
}

export async function withStoreRead<T>(fn: () => T | Promise<T>): Promise<T> {
  if (!persistEnabled()) return await fn();
  return mutexLock(PROPERTY, async () => {
    const loaded = await pullStore();
    if (!loaded) throw new PersistError(lastFailure ?? classifyPersistError("runtime_state.pull", null));
    return fn();
  });
}
