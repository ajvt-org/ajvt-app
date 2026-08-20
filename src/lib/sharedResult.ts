interface Entry<T> {
  at: number;
  value: T;
}

const entries = new Map<string, Entry<unknown>>();
const running = new Map<string, Promise<unknown>>();
const SWEEP_ABOVE = 200;

function sweep(now: number, ttlMs: number): void {
  if (entries.size <= SWEEP_ABOVE) return;
  for (const [key, entry] of entries) {
    if (now - entry.at >= ttlMs) entries.delete(key);
  }
}

export async function sharedResult<T>(
  key: string,
  now: number,
  ttlMs: number,
  compute: () => Promise<T>,
): Promise<T> {
  const held = entries.get(key) as Entry<T> | undefined;
  if (held && now - held.at < ttlMs) return held.value;

  const inFlight = running.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  const started = compute()
    .then((value) => {
      sweep(now, ttlMs);
      entries.set(key, { at: now, value });
      return value;
    })
    .finally(() => running.delete(key));

  running.set(key, started);
  return started;
}

export function forgetShared(): void {
  entries.clear();
  running.clear();
}
