"use client";

import AdminList, { type AdminListPagination } from "@/components/admin/AdminList";
import { paymentsPage as texts } from "@/lib/texts";
import ProofCard from "./ProofCard";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import type { DestinationOption } from "@/lib/moneyDestination";
import type { MemberOption, Proof } from "./paymentTypes";

export default function PaymentsList({
  proofs,
  focusId,
  members,
  destinations,
  financeTags,
  busyId,
  errorOn,
  onReview,
  onDelete,
  onLink,
  onPatch,
  onMembershipChanged,
  pagination,
}: {
  proofs: Proof[];
  focusId?: string;
  members: MemberOption[];
  destinations: DestinationOption[];
  financeTags: FinanceTag[];
  busyId: string | null;
  errorOn: (id: string) => string;
  onReview: (proof: Proof, status: "ACTIVE" | "REJECTED") => void;
  onDelete: (proof: Proof) => void;
  onLink: (proof: Proof, userId: string | null) => void;
  onPatch: (proof: Proof, changes: Partial<Proof>) => void;
  onMembershipChanged: () => void;
  pagination?: AdminListPagination;
}) {
  return (
    <AdminList
      items={proofs}
      getKey={(proof) => `${proof.kind}-${proof.id}`}
      renderRow={(proof) => (
        <ProofCard
          proof={proof}
          focused={proof.id === focusId}
          members={members}
          destinations={destinations}
          financeTags={financeTags}
          busy={busyId === proof.id}
          error={errorOn(proof.id)}
          onReview={(status) => onReview(proof, status)}
          onDelete={() => onDelete(proof)}
          onLink={(userId) => onLink(proof, userId)}
          onPatch={(changes) => onPatch(proof, changes)}
          onMembershipChanged={onMembershipChanged}
        />
      )}
      emptyMessage={texts.noResults}
      pagination={pagination}
    />
  );
}
