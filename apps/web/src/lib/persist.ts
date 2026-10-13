import { withLock as mutexLock } from "./mutex";
import { serviceClient, usingSupabaseStore } from "./supabase-admin";

const PROPERTY = process.env.PROPERTY_ID ?? "vfarms-hyderabad";

type StoreIo = {
  serialize: () => Record<string, unknown>;
  hydrate: (payload: unknown) => void;
};

let io: StoreIo | null = null;

export function registerStoreIo(next: StoreIo) {
  io = next;
}

export function persistEnabled() {
  return usingSupabaseStore();
}

export class PersistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistError";
  }
}

export async function pullStore() {
  if (!persistEnabled() || !io) return true;
  const client = serviceClient();
  if (!client) return false;
  const { data, error } = await client.from("runtime_state").select("payload").eq("property_slug", PROPERTY).maybeSingle();
  if (error) {
    console.error("runtime_state pull failed", error.code);
    return false;
  }
  if (data?.payload) io.hydrate(data.payload);
  return true;
}

export async function pushStore() {
  if (!persistEnabled() || !io) return true;
  const client = serviceClient();
  if (!client) return false;
  const { error } = await client.from("runtime_state").upsert(
    { property_slug: PROPERTY, payload: io.serialize(), updated_at: new Date().toISOString() },
    { onConflict: "property_slug" },
  );
  if (error) {
    console.error("runtime_state push failed", error.code);
    return false;
  }
  return true;
}

export async function withStore<T>(fn: () => T | Promise<T>): Promise<T> {
  if (!persistEnabled()) return await fn();
  return mutexLock(PROPERTY, async () => {
    const loaded = await pullStore();
    if (!loaded) throw new PersistError("Inventory store could not be loaded from the database.");
    const result = await fn();
    const saved = await pushStore();
    if (!saved) throw new PersistError("Inventory store could not be saved.");
    return result;
  });
}

export async function withStoreRead<T>(fn: () => T | Promise<T>): Promise<T> {
  if (!persistEnabled()) return await fn();
  return mutexLock(PROPERTY, async () => {
    const loaded = await pullStore();
    if (!loaded) throw new PersistError("Inventory store could not be loaded from the database.");
    return fn();
  });
}
