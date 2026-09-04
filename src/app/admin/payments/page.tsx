"use client";

import { Suspense, useState } from "react";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import { paymentAccountPicker, paymentsPage as texts } from "@/lib/texts";
import KindTabs from "./KindTabs";
import ManualDonationDialog from "./ManualDonationDialog";
import PaymentsList from "./PaymentsList";
import { usePaymentsData } from "./usePaymentsData";
import { useDonationActions } from "./useDonationActions";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import { paginate, pageCount } from "@/lib/listUrlState";
import {
  PAYMENTS_FILTER_KEYS,
  accountOptionsOf,
  matchesAccount,
  readPaymentsFilters,
  NO_ACCOUNT,
  writePaymentsFilters,
  type PaymentsFilters,
} from "./paymentsFilters";
import { PAGE_SIZE, type Proof } from "./paymentTypes";

function match(proof: Proof, filters: PaymentsFilters) {
  if (filters.kind !== "ALL" && proof.kind !== filters.kind) return false;
  if (!matchesAccount(proof, filters.account)) return false;
  const query = filters.q.trim();
  if (!query) return true;
  return proof.memberName.includes(query) || (proof.activityTitle || "").includes(query);
}

function AdminPaymentsPageInner() {
  const { proofs, members, destinations, tags, loading, setProofs } = usePaymentsData();
  const { filters, page, go, goToPage } = useAdminListUrlState("/admin/payments", {
    keys: PAYMENTS_FILTER_KEYS,
    readFilters: readPaymentsFilters,
    writeFilters: writePaymentsFilters,
  });
  const [adding, setAdding] = useState(false);

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
  const filtered = proofs.filter((p) => match(p, filters));
  const totalPages = pageCount(filtered.length, PAGE_SIZE);
  const current = Math.min(page, totalPages);
  const shown = paginate(filtered, page, PAGE_SIZE);

  return (
    <div className="admin-page space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="receipt">{texts.title(proofs.length)}</IconLabel>
        </p>
        <button
          onClick={() => setAdding(true)}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          <IconLabel name="plus">{texts.addDonation}</IconLabel>
        </button>
      </div>

      <KindTabs active={filters.kind} onPick={(next) => go({ ...filters, kind: next })} />

      <input
        type="text"
        placeholder={texts.search}
        value={filters.q}
        onChange={(e) => go({ ...filters, q: e.target.value })}
        className="input text-sm"
      />

      {accountOptions.length > 0 && (
        <select
          aria-label={texts.accountFilter}
          value={filters.account}
          onChange={(e) => go({ ...filters, account: e.target.value })}
          className="input text-sm"
        >
          <option value="">{texts.allAccounts}</option>
          {accountOptions.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code}
            </option>
          ))}
          <option value={NO_ACCOUNT}>{paymentAccountPicker.unknown}</option>
        </select>
      )}

      <PaymentsList
        proofs={shown}
        members={members}
        destinations={destinations}
        financeTags={tags}
        busyId={actions.busyId}
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
        pagination={{ page: current, totalPages, onGo: goToPage }}
      />

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
