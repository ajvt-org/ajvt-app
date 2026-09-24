"use client";

import MemberDrawer from "./MemberDrawer";
import ProofZoom from "./ProofZoom";
import type { useMemberReview } from "./useMemberReview";

export default function MemberReview({ review }: { review: ReturnType<typeof useMemberReview> }) {
  const { selected } = review;
  if (!selected) return null;

  return (
    <>
      <MemberDrawer
        member={selected}
        actionLoading={review.actionLoading}
        showRejectPicker={review.showRejectPicker}
        rejectReason={review.rejectReason}
        onClose={review.close}
        onZoomProof={() => review.setProofZoom(true)}
        onProofSaved={review.refreshSelected}
        onRejectReason={review.setRejectReason}
        onOpenRejectPicker={() => review.setShowRejectPicker(true)}
        onCloseRejectPicker={() => review.setShowRejectPicker(false)}
        error={review.reviewError}
        onApprove={() => review.validate(selected.id, "ACTIVE")}
        onReject={() => review.validate(selected.id, "REJECTED", review.rejectReason)}
      />
      {review.proofZoom && selected.paymentProof && (
        <ProofZoom filename={selected.paymentProof} onClose={() => review.setProofZoom(false)} />
      )}
    </>
  );
}
