export interface DestinationShare {
  activityId: string | null;
  competitionId: string | null;
  amount: number;
}

export function evenSplit(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, at) => base + (at < remainder ? 1 : 0));
}

export function sharesTotal(shares: readonly { amount: number }[]): number {
  return shares.reduce((sum, share) => sum + share.amount, 0);
}

export function sharesMatchTotal(shares: readonly { amount: number }[], total: number): boolean {
  return sharesTotal(shares) === total;
}
