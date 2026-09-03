"use client";

import { Suspense, useState } from "react";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import KindTabs from "./KindTabs";
import ManualDonationDialog from "./ManualDonationDialog";
import PaymentsList from "./PaymentsList";
import { usePaymentsData } from "./usePaymentsData";
import { useDonationActions } from "./useDonationActions";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import { paginate, pageCount } from "@/lib/listUrlState";
import {
  PAYMENTS_FILTER_KEYS,
  readPaymentsFilters,
  writePaymentsFilters,
  type PaymentsFilters,
} from "./paymentsFilters";
import { PAGE_SIZE, type Proof } from "./paymentTypes";

function match(proof: Proof, filters: PaymentsFilters) {
  if (filters.kind !== "ALL" && proof.kind !== filters.kind) return false;
  const query = filters.q.trim();
  if (!query) return true;
  return proof.memberName.includes(query) || (proof.activityTitle || "").includes(query);
}

function AdminPaymentsPageInner() {
  const { proofs, members, activities, tags, loading, setProofs } = usePaymentsData();
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

  const filtered = proofs.filter((p) => match(p, filters));
  const totalPages = pageCount(filtered.length, PAGE_SIZE);
  const current = Math.min(page, totalPages);
  const shown = paginate(filtered, page, PAGE_SIZE);

  return (
    <div className="admin-page space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="receipt">كل إثباتات الدفع ({proofs.length})</IconLabel>
        </p>
        <button
          onClick={() => setAdding(true)}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          <IconLabel name="plus">تسجيل تبرع يدوياً</IconLabel>
        </button>
      </div>

      <KindTabs active={filters.kind} onPick={(next) => go({ ...filters, kind: next })} />

      <input
        type="text"
        placeholder="بحث بالاسم أو النشاط..."
        value={filters.q}
        onChange={(e) => go({ ...filters, q: e.target.value })}
        className="input text-sm"
      />

      <PaymentsList
        proofs={shown}
        members={members}
        activities={activities}
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
          activities={activities}
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
