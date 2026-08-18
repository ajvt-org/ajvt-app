"use client";

import AdminList, { type AdminListPagination } from "@/components/admin/AdminList";
import ProofCard from "./ProofCard";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import type { ActivityOption, MemberOption, Proof } from "./paymentTypes";

export default function PaymentsList({
  proofs,
  members,
  activities,
  financeTags,
  busyId,
  onReview,
  onDelete,
  onLink,
  onPatch,
  pagination,
}: {
  proofs: Proof[];
  members: MemberOption[];
  activities: ActivityOption[];
  financeTags: FinanceTag[];
  busyId: string | null;
  onReview: (proof: Proof, status: "ACTIVE" | "REJECTED") => void;
  onDelete: (proof: Proof) => void;
  onLink: (proof: Proof, memberId: string | null) => void;
  onPatch: (proof: Proof, changes: Partial<Proof>) => void;
  pagination?: AdminListPagination;
}) {
  return (
    <AdminList
      items={proofs}
      getKey={(proof) => `${proof.kind}-${proof.id}`}
      renderRow={(proof) => (
        <ProofCard
          proof={proof}
          members={members}
          activities={activities}
          financeTags={financeTags}
          busy={busyId === proof.id}
          onReview={(status) => onReview(proof, status)}
          onDelete={() => onDelete(proof)}
          onLink={(memberId) => onLink(proof, memberId)}
          onPatch={(changes) => onPatch(proof, changes)}
        />
      )}
      emptyMessage="لا توجد نتائج"
      pagination={pagination}
    />
  );
}
