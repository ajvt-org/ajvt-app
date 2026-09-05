import type { PaymentMethodOption } from "./paymentMethods";
import { inOrder } from "./paymentMethods";

export interface MethodUsage {
  name: string | null;
  count: number;
}

export interface AdminMethodRow extends PaymentMethodOption {
  used: number;
  accounts: AdminAccountRow[];
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
  return inOrder(methods).map((method) => ({
    ...method,
    used: totals.get(method.name) ?? 0,
    accounts: [],
  }));
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

export interface AccountUsage {
  accountId: string | null;
  count: number;
}

export interface AdminAccountRow {
  id: string;
  code: string;
  label: string | null;
  position: number;
  active: boolean;
  closedAt: Date | null;
  used: number;
}

type AccountLike = Omit<AdminAccountRow, "used">;

export function usageByAccount(usage: AccountUsage[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of usage) {
    if (!row.accountId) continue;
    totals.set(row.accountId, (totals.get(row.accountId) ?? 0) + row.count);
  }
  return totals;
}

export function adminAccountRows(
  accounts: AccountLike[],
  usage: AccountUsage[],
): AdminAccountRow[] {
  const totals = usageByAccount(usage);
  return [...accounts]
    .sort((a, b) => a.position - b.position || a.code.localeCompare(b.code))
    .map((account) => ({ ...account, used: totals.get(account.id) ?? 0 }));
}

export function nextAccountPosition(accounts: { position: number }[]): number {
  return accounts.reduce((highest, account) => Math.max(highest, account.position), 0) + 1;
}

export function readCode(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, "") : "";
}

export function swappedAccountPositions(
  accounts: AccountLike[],
  id: string,
  move: "up" | "down",
): [AccountLike, AccountLike] | null {
  const ordered = [...accounts].sort(
    (a, b) => a.position - b.position || a.code.localeCompare(b.code),
  );
  const at = ordered.findIndex((account) => account.id === id);
  if (at === -1) return null;
  const other = ordered[move === "up" ? at - 1 : at + 1];
  return other ? [ordered[at], other] : null;
}

export function openAccountRows<T extends { active: boolean; closedAt: Date | null }>(
  accounts: T[],
): T[] {
  return accounts.filter((account) => account.active && account.closedAt === null);
}

export function reachesNobody(method: AdminMethodRow): boolean {
  return method.memberFacing && method.active && openAccountRows(method.accounts).length === 0;
}
