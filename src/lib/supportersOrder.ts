export interface SupporterOrderInput {
  key: string;
  name: string;
  total: number;
  reachedAt: Date;
}

export function compareSupporters(a: SupporterOrderInput, b: SupporterOrderInput): number {
  if (a.total !== b.total) return b.total - a.total;

  const reached = a.reachedAt.getTime() - b.reachedAt.getTime();
  if (reached !== 0) return reached;

  const byName = a.name.localeCompare(b.name, "ar");
  if (byName !== 0) return byName;

  if (a.key === b.key) return 0;
  return a.key < b.key ? -1 : 1;
}

export function orderSupporters<T extends SupporterOrderInput>(
  rows: T[],
): (T & { position: number })[] {
  return [...rows].sort(compareSupporters).map((row, index) => ({ ...row, position: index + 1 }));
}
