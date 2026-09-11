export function uniqueExpenses<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export type ProofReuseKind = "member" | "donation" | "expense";

export function proofReuseHref(kind: ProofReuseKind, id: string, label: string): string {
  if (kind === "member") return `/admin/members/${id}`;
  if (kind === "donation") return `/admin/payments?focus=${encodeURIComponent(id)}`;
  return label ? `/admin/expenses?q=${encodeURIComponent(label)}` : "/admin/expenses";
}
