// A small stale-if-error cache, per server instance: a value is reused for `ttlMs`; when a refresh
// fails, the last good value is returned with `stale: true` instead of an error.

interface Entry {
  value: unknown;
  at: number;
  pending?: Promise<unknown>;
}
const cache = new Map<string, Entry>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<{ value: T; stale: boolean }> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return { value: hit.value as T, stale: false };
  const pending =
    (hit?.pending as Promise<T> | undefined) ??
    load().then(
      (value) => {
        cache.set(key, { value, at: Date.now() });
        return value;
      },
      (err) => {
        const e = cache.get(key);
        if (e) e.pending = undefined;
        throw err;
      },
    );
  if (hit) hit.pending = pending;
  else cache.set(key, { value: undefined, at: 0, pending });
  try {
    return { value: await pending, stale: false };
  } catch (err) {
    if (hit && hit.at > 0) return { value: hit.value as T, stale: true };
    cache.delete(key);
    throw err;
  }
}

/** When the value under `key` was last fetched (ms), if it ever was. */
export function cacheAt(key: string): number | undefined {
  const e = cache.get(key);
  return e && e.at > 0 ? e.at : undefined;
}
