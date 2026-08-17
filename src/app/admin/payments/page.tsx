"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import KindTabs, { type KindFilter } from "./KindTabs";
import ManualDonationDialog from "./ManualDonationDialog";
import Pagination from "./Pagination";
import ProofCard from "./ProofCard";
import { usePaymentsData } from "./usePaymentsData";
import { useDonationActions } from "./useDonationActions";
import { PAGE_SIZE, type Proof } from "./paymentTypes";

function match(proof: Proof, kind: KindFilter, query: string) {
  if (kind !== "ALL" && proof.kind !== kind) return false;
  if (!query) return true;
  return proof.memberName.includes(query) || (proof.activityTitle || "").includes(query);
}

export default function AdminPaymentsPage() {
  const { proofs, members, tags, loading, setProofs } = usePaymentsData();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  const actions = useDonationActions({
    members,
    patch: (id, changes) =>
      setProofs((prev) =>
        prev.map((p) => (p.id === id && p.kind === "DONATION" ? { ...p, ...changes } : p)),
      ),
    remove: (id) =>
      setProofs((prev) => prev.filter((p) => !(p.id === id && p.kind === "DONATION"))),
  });

  if (loading) return <PageLoading />;

  const filtered = proofs.filter((p) => match(p, kind, search.trim()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function refilter(next: () => void) {
    next();
    setPage(1);
  }

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

      <KindTabs active={kind} onPick={(next) => refilter(() => setKind(next))} />

      <input
        type="text"
        placeholder="بحث بالاسم أو النشاط..."
        value={search}
        onChange={(e) => refilter(() => setSearch(e.target.value))}
        className="input text-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          لا توجد نتائج
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((proof) => (
            <ProofCard
              key={`${proof.kind}-${proof.id}`}
              proof={proof}
              members={members}
              financeTags={tags}
              busy={actions.busyId === proof.id}
              onReview={(status) => actions.review(proof.id, status)}
              onDelete={() => actions.destroy(proof.id)}
              onLink={(memberId) => actions.link(proof.id, memberId)}
              onPatch={(changes) =>
                setProofs((prev) =>
                  prev.map((p) =>
                    p.id === proof.id && p.kind === "DONATION" ? { ...p, ...changes } : p,
                  ),
                )
              }
            />
          ))}
        </div>
      )}

      <Pagination page={current} totalPages={totalPages} onGo={setPage} />

      {adding && (
        <ManualDonationDialog
          onClose={() => setAdding(false)}
          onCreated={(proof) => setProofs((prev) => [proof, ...prev])}
        />
      )}
    </div>
  );
}
