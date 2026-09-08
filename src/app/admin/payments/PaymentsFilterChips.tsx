"use client";

import FilterChipRow, { type FilterChip } from "@/components/admin/filters/FilterChipRow";
import {
  PAYMENT_KIND_LABEL,
  PROOF_STATUS_LABEL,
  filterSheet,
  paymentAccountPicker,
  paymentsPage as texts,
} from "@/lib/texts";
import { NO_ACCOUNT, NO_PAYMENTS_FILTERS, type PaymentsFilters } from "./paymentsFilters";

const RECEIPT_LABEL: Record<string, string> = {
  with: texts.withReceipt,
  without: texts.withoutReceipt,
};

const LINKED_LABEL: Record<string, string> = {
  yes: texts.isLinked,
  no: texts.notLinked,
};

function accountLabel(id: string, options: { id: string; code: string }[]): string {
  if (id === NO_ACCOUNT) return paymentAccountPicker.unknown;
  return options.find((option) => option.id === id)?.code ?? id;
}

export function chipsFor(
  filters: PaymentsFilters,
  accountOptions: { id: string; code: string }[],
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.kind !== "ALL") chips.push({ key: "kind", label: PAYMENT_KIND_LABEL[filters.kind] });
  if (filters.status && PROOF_STATUS_LABEL[filters.status])
    chips.push({ key: "status", label: PROOF_STATUS_LABEL[filters.status] });
  if (filters.account)
    chips.push({ key: "account", label: accountLabel(filters.account, accountOptions) });
  if (filters.from) chips.push({ key: "from", label: `${filterSheet.from} ${filters.from}` });
  if (filters.to) chips.push({ key: "to", label: `${filterSheet.to} ${filters.to}` });
  if (RECEIPT_LABEL[filters.receipt])
    chips.push({ key: "receipt", label: RECEIPT_LABEL[filters.receipt] });
  if (LINKED_LABEL[filters.linked])
    chips.push({ key: "linked", label: LINKED_LABEL[filters.linked] });
  return chips;
}

export default function PaymentsFilterChips({
  filters,
  accountOptions,
  resultCount,
  onChange,
}: {
  filters: PaymentsFilters;
  accountOptions: { id: string; code: string }[];
  resultCount: number;
  onChange: (next: PaymentsFilters) => void;
}) {
  return (
    <FilterChipRow
      chips={chipsFor(filters, accountOptions)}
      resultCount={resultCount}
      onRemove={(key) => onChange({ ...filters, focus: "", [key]: key === "kind" ? "ALL" : "" })}
      onClear={() => onChange({ ...NO_PAYMENTS_FILTERS, q: filters.q, sort: filters.sort })}
    />
  );
}
