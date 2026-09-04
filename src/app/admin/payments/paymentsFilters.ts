import type { KindFilter } from "./KindTabs";

export const PAYMENTS_FILTER_KEYS = ["kind", "q", "account"];

export const NO_ACCOUNT = "UNKNOWN";

export interface PaymentsFilters {
  kind: KindFilter;
  q: string;
  account: string;
}

export function readPaymentsFilters(params: URLSearchParams): PaymentsFilters {
  const kind = params.get("kind");
  return {
    kind: kind === "MEMBERSHIP" || kind === "ACTIVITY" || kind === "DONATION" ? kind : "ALL",
    q: params.get("q") || "",
    account: params.get("account") || "",
  };
}

export function writePaymentsFilters(filters: PaymentsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.kind !== "ALL") params.set("kind", filters.kind);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.account) params.set("account", filters.account);
  return params;
}

export interface AccountHolder {
  accountId?: string | null;
  account?: { id: string; code: string; label: string | null } | null;
}

export function matchesAccount(row: AccountHolder, account: string): boolean {
  if (!account) return true;
  if (account === NO_ACCOUNT) return !row.accountId;
  return row.accountId === account;
}

export function accountOptionsOf(rows: AccountHolder[]): { id: string; code: string }[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.account) seen.set(row.account.id, row.account.code);
  }
  return [...seen.entries()]
    .map(([id, code]) => ({ id, code }))
    .sort((a, b) => a.code.localeCompare(b.code));
}
