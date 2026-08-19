export function surplusOf(paidAmount: string | number, fee: number): number {
  const paid = Number(paidAmount);
  if (!Number.isFinite(paid)) return 0;
  return Math.max(0, paid - fee);
}
