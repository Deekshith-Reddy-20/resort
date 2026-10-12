const queue = new Map<string, Promise<void>>();

export async function withLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
  const prev = queue.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  queue.set(
    key,
    prev.then(() => current),
  );
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (queue.get(key) === current) queue.delete(key);
  }
}
