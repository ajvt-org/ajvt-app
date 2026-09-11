import { paymentDate } from "@/lib/paymentDate";
import { splitPayment } from "@/lib/membershipPayment";
import type { KindFilter } from "./KindTabs";
import { matchesSearch } from "./paymentsSearch";
import { DEFAULT_SORT, readPaymentSort, type PaymentSort } from "./paymentsSort";
import type { Proof } from "./paymentTypes";

export const PAYMENTS_FILTER_KEYS = [
  "kind",
  "q",
  "status",
  "account",
  "from",
  "to",
  "receipt",
  "linked",
  "sort",
  "focus",
];

export const NO_ACCOUNT = "UNKNOWN";

export interface PaymentsFilters {
  kind: KindFilter;
  q: string;
  status: string;
  account: string;
  from: string;
  to: string;
  receipt: string;
  linked: string;
  sort: PaymentSort;
  focus: string;
}

export const NO_PAYMENTS_FILTERS: PaymentsFilters = {
  kind: "ALL",
  q: "",
  status: "",
  account: "",
  from: "",
  to: "",
  receipt: "",
  linked: "",
  sort: DEFAULT_SORT,
  focus: "",
};

const KINDS: KindFilter[] = ["MEMBERSHIP", "ACTIVITY", "DONATION"];

function readKind(value: string | null): KindFilter {
  return KINDS.includes(value as KindFilter) ? (value as KindFilter) : "ALL";
}

export function readPaymentsFilters(params: URLSearchParams): PaymentsFilters {
  return {
    kind: readKind(params.get("kind")),
    q: params.get("q") || "",
    status: params.get("status") || "",
    account: params.get("account") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
    receipt: params.get("receipt") || "",
    linked: params.get("linked") || "",
    sort: readPaymentSort(params.get("sort")),
    focus: params.get("focus") || "",
  };
}

export function writePaymentsFilters(filters: PaymentsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.kind !== "ALL") params.set("kind", filters.kind);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.account) params.set("account", filters.account);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.receipt) params.set("receipt", filters.receipt);
  if (filters.linked) params.set("linked", filters.linked);
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  if (filters.focus) params.set("focus", filters.focus);
  return params;
}

export function activePaymentsFilterCount(filters: PaymentsFilters): number {
  return [
    filters.kind !== "ALL",
    !!filters.status,
    !!filters.account,
    !!filters.from,
    !!filters.to,
    !!filters.receipt,
    !!filters.linked,
  ].filter(Boolean).length;
}

export function pageHolding(ids: string[], focus: string, pageSize: number): number | null {
  if (!focus) return null;
  const index = ids.indexOf(focus);
  return index === -1 ? null : Math.floor(index / pageSize) + 1;
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

function matchesDateRange(proof: Proof, from: string, to: string): boolean {
  if (!from && !to) return true;
  const day = paymentDate({ paidOn: proof.paidOn, createdAt: proof.submittedAt }).slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function matchesReceipt(proof: Proof, receipt: string): boolean {
  if (!receipt) return true;
  return receipt === "with" ? !!proof.receipt : !proof.receipt;
}

function matchesLinked(proof: Proof, linked: string): boolean {
  if (!linked) return true;
  return linked === "yes" ? !!proof.userId : !proof.userId;
}

export function isMembershipSurplus(proof: Proof): boolean {
  if (proof.kind !== "MEMBERSHIP" || proof.amount == null) return false;
  return splitPayment(proof.amount, proof.feeApplied ?? 0).surplus > 0;
}

function matchesKind(proof: Proof, kind: KindFilter): boolean {
  if (kind === "ALL" || proof.kind === kind) return true;
  return kind === "DONATION" && isMembershipSurplus(proof);
}

export function matchesPaymentsFilters(proof: Proof, filters: PaymentsFilters): boolean {
  if (!matchesKind(proof, filters.kind)) return false;
  if (filters.status && proof.status !== filters.status) return false;
  if (!matchesAccount(proof, filters.account)) return false;
  if (!matchesDateRange(proof, filters.from, filters.to)) return false;
  if (!matchesReceipt(proof, filters.receipt)) return false;
  if (!matchesLinked(proof, filters.linked)) return false;
  return matchesSearch(proof, filters.q);
}
