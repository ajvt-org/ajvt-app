"use client";

import { Suspense, useState } from "react";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import { PAYMENT_SORT_LABEL, paymentsPage as texts } from "@/lib/texts";
import Icon from "@/components/Icon";
import KindTabs from "./KindTabs";
import PaymentsFilterChips from "./PaymentsFilterChips";
import PaymentsFilterSheet from "./PaymentsFilterSheet";
import ManualDonationDialog from "./ManualDonationDialog";
import PaymentsList from "./PaymentsList";
import { usePaymentsData } from "./usePaymentsData";
import { useDonationActions } from "./useDonationActions";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import { paginate, pageCount } from "@/lib/listUrlState";
import {
  PAYMENTS_FILTER_KEYS,
  accountOptionsOf,
  activePaymentsFilterCount,
  matchesPaymentsFilters,
  readPaymentsFilters,
  pageHolding,
  writePaymentsFilters,
} from "./paymentsFilters";
import { PAYMENT_SORTS, readPaymentSort, sortPayments } from "./paymentsSort";
import { PAGE_SIZE } from "./paymentTypes";

function AdminPaymentsPageInner() {
  const { proofs, members, destinations, tags, loading, setProofs, reload } = usePaymentsData();
  const { filters, page, go, goToPage } = useAdminListUrlState("/admin/payments", {
    keys: PAYMENTS_FILTER_KEYS,
    readFilters: readPaymentsFilters,
    writeFilters: writePaymentsFilters,
  });
  const [adding, setAdding] = useState(false);
  const [filtering, setFiltering] = useState(false);

  const actions = useDonationActions({
    patch: (id, changes) =>
      setProofs((prev) =>
        prev.map((p) => (p.id === id && p.kind === "DONATION" ? { ...p, ...changes } : p)),
      ),
    remove: (id) =>
      setProofs((prev) => prev.filter((p) => !(p.id === id && p.kind === "DONATION"))),
  });

  if (loading) return <PageLoading />;

  const accountOptions = accountOptionsOf(proofs);
  const filtered = sortPayments(
    proofs.filter((p) => matchesPaymentsFilters(p, filters)),
    filters.sort,
  );
  const totalPages = pageCount(filtered.length, PAGE_SIZE);
  const holding = pageHolding(
    filtered.map((p) => p.id),
    filters.focus,
    PAGE_SIZE,
  );
  const current = Math.min(page === 1 && holding ? holding : page, totalPages);
  const shown = paginate(filtered, current, PAGE_SIZE);
  const activeCount = activePaymentsFilterCount(filters);

  return (
    <div className="admin-page space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="list">{texts.title(proofs.length)}</IconLabel>
        </p>
        <button
          onClick={() => setAdding(true)}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          <IconLabel name="plus">{texts.addDonation}</IconLabel>
        </button>
      </div>

      <KindTabs
        active={filters.kind}
        onPick={(next) => go({ ...filters, focus: "", kind: next })}
      />

      <input
        type="text"
        placeholder={texts.search}
        value={filters.q}
        onChange={(e) => go({ ...filters, focus: "", q: e.target.value })}
        className="input text-sm"
      />

      <div className="flex items-center gap-2">
        <select
          aria-label={texts.sortBy}
          value={filters.sort}
          onChange={(e) => go({ ...filters, focus: "", sort: readPaymentSort(e.target.value) })}
          className="input text-sm"
        >
          {PAYMENT_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {PAYMENT_SORT_LABEL[sort]}
            </option>
          ))}
        </select>
        <button
          onClick={() => setFiltering(true)}
          className="text-xs px-3 py-2 rounded-lg font-bold shrink-0 flex items-center gap-1.5"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <Icon name="filter" size={14} />
          {texts.filter}
          {activeCount > 0 && <span className="badge badge-numeral">{activeCount}</span>}
        </button>
      </div>

      <PaymentsFilterChips
        filters={filters}
        accountOptions={accountOptions}
        resultCount={filtered.length}
        onChange={go}
      />

      <PaymentsList
        proofs={shown}
        focusId={filters.focus}
        members={members}
        destinations={destinations}
        financeTags={tags}
        busyId={actions.busyId}
        errorOn={actions.errorOn}
        onReview={(proof, status) => actions.review(proof.id, status)}
        onDelete={(proof) => actions.destroy(proof.id)}
        onLink={(proof, userId) => actions.link(proof.id, userId)}
        onPatch={(proof, changes) =>
          setProofs((prev) =>
            prev.map((p) =>
              p.id === proof.id && p.kind === "DONATION" ? { ...p, ...changes } : p,
            ),
          )
        }
        onMembershipChanged={reload}
        pagination={{ page: current, totalPages, onGo: goToPage }}
      />

      {filtering && (
        <PaymentsFilterSheet
          filters={filters}
          accountOptions={accountOptions}
          resultCount={filtered.length}
          onChange={go}
          onClose={() => setFiltering(false)}
        />
      )}

      {adding && (
        <ManualDonationDialog
          destinations={destinations}
          members={members}
          onClose={() => setAdding(false)}
          onCreated={(proof) => setProofs((prev) => [proof, ...prev])}
        />
      )}
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminPaymentsPageInner />
    </Suspense>
  );
}
