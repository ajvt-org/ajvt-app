import type { PaymentMethodOption } from "./paymentMethods";
import { inOrder } from "./paymentMethods";

export interface MethodUsage {
  name: string | null;
  count: number;
}

export interface AdminMethodRow extends PaymentMethodOption {
  used: number;
}

export function usageByName(usage: MethodUsage[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of usage) {
    const name = row.name?.trim();
    if (!name) continue;
    totals.set(name, (totals.get(name) ?? 0) + row.count);
  }
  return totals;
}

export function adminMethodRows(
  methods: PaymentMethodOption[],
  usage: MethodUsage[],
): AdminMethodRow[] {
  const totals = usageByName(usage);
  return inOrder(methods).map((method) => ({ ...method, used: totals.get(method.name) ?? 0 }));
}

export function nextPosition(methods: PaymentMethodOption[]): number {
  return methods.reduce((highest, method) => Math.max(highest, method.position), 0) + 1;
}

export function readName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function swappedPositions(
  methods: PaymentMethodOption[],
  id: string,
  direction: "up" | "down",
): [PaymentMethodOption, PaymentMethodOption] | null {
  const ordered = inOrder(methods);
  const at = ordered.findIndex((method) => method.id === id);
  if (at === -1) return null;
  const other = direction === "up" ? at - 1 : at + 1;
  if (other < 0 || other >= ordered.length) return null;
  return [ordered[at], ordered[other]];
}
