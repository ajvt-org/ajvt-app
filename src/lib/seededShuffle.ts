export function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let hash = 7;
  for (const ch of seed) hash = (hash * 33 + ch.charCodeAt(0)) % 2_147_483_647;
  for (let i = out.length - 1; i > 0; i--) {
    hash = (hash * 1_103_515_245 + 12_345) % 2_147_483_647;
    const j = hash % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
