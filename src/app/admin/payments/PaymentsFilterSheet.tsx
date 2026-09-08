"use client";

import DateRangeFilter from "@/components/admin/filters/DateRangeFilter";
import FilterSheetShell, { FilterField } from "@/components/admin/filters/FilterSheetShell";
import {
  PAYMENT_KIND_LABEL,
  PROOF_STATUS_LABEL,
  paymentAccountPicker,
  paymentsPage as texts,
} from "@/lib/texts";
import {
  NO_ACCOUNT,
  NO_PAYMENTS_FILTERS,
  activePaymentsFilterCount,
  type PaymentsFilters,
} from "./paymentsFilters";
import type { KindFilter } from "./KindTabs";

const KINDS: KindFilter[] = ["ALL", "MEMBERSHIP", "ACTIVITY", "DONATION"];
const STATUSES = ["PENDING", "ACTIVE", "REJECTED"];

export default function PaymentsFilterSheet({
  filters,
  accountOptions,
  resultCount,
  onChange,
  onClose,
}: {
  filters: PaymentsFilters;
  accountOptions: { id: string; code: string }[];
  resultCount: number;
  onChange: (next: PaymentsFilters) => void;
  onClose: () => void;
}) {
  const set = (changes: Partial<PaymentsFilters>) =>
    onChange({ ...filters, focus: "", ...changes });

  return (
    <FilterSheetShell
      activeCount={activePaymentsFilterCount(filters)}
      resultCount={resultCount}
      onClear={() => onChange({ ...NO_PAYMENTS_FILTERS, q: filters.q, sort: filters.sort })}
      onClose={onClose}
    >
      <FilterField label={texts.status}>
        <select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
          className="input input-sm w-full"
          aria-label={texts.status}
        >
          <option value="">{texts.allStatuses}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {PROOF_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label={texts.paymentDate}>
        <DateRangeFilter
          from={filters.from}
          to={filters.to}
          idPrefix="payments"
          onChange={(range) => set(range)}
        />
      </FilterField>

      <FilterField label={texts.account}>
        <select
          value={filters.account}
          onChange={(e) => set({ account: e.target.value })}
          className="input input-sm w-full"
          aria-label={texts.accountFilter}
        >
          <option value="">{texts.allAccounts}</option>
          {accountOptions.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code}
            </option>
          ))}
          <option value={NO_ACCOUNT}>{paymentAccountPicker.unknown}</option>
        </select>
      </FilterField>

      <FilterField label={texts.kind}>
        <select
          value={filters.kind}
          onChange={(e) => set({ kind: e.target.value as KindFilter })}
          className="input input-sm w-full"
          aria-label={texts.kind}
        >
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {PAYMENT_KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label={texts.receipt}>
        <select
          value={filters.receipt}
          onChange={(e) => set({ receipt: e.target.value })}
          className="input input-sm w-full"
          aria-label={texts.receipt}
        >
          <option value="">{texts.anyReceipt}</option>
          <option value="with">{texts.withReceipt}</option>
          <option value="without">{texts.withoutReceipt}</option>
        </select>
      </FilterField>

      <FilterField label={texts.linked}>
        <select
          value={filters.linked}
          onChange={(e) => set({ linked: e.target.value })}
          className="input input-sm w-full"
          aria-label={texts.linked}
        >
          <option value="">{texts.anyLink}</option>
          <option value="yes">{texts.isLinked}</option>
          <option value="no">{texts.notLinked}</option>
        </select>
      </FilterField>
    </FilterSheetShell>
  );
}
