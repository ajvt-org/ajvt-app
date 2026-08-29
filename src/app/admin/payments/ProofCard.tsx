"use client";

import { useState } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import RecordHistory from "@/components/admin/RecordHistory";
import ProofReuseWarning from "@/components/admin/ProofReuseWarning";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import DonationTags from "./DonationTags";
import DonationActions from "./DonationActions";
import DonationEditForm from "./DonationEditForm";
import LinkMemberPanel from "./LinkMemberPanel";
import ProofThumb from "./ProofThumb";
import { HISTORY_TARGET, REUSE_KIND } from "./proofKinds";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  type ActivityOption,
  type MemberOption,
  type Proof,
} from "./paymentTypes";

function Origin({ proof }: { proof: Proof }) {
  if (proof.kind === "MEMBERSHIP") return <IconLabel name="card">عضوية الرابطة</IconLabel>;
  if (proof.activityTitle) return <IconLabel name="trophy">{proof.activityTitle}</IconLabel>;
  return <IconLabel name="heart">دعم عام للرابطة</IconLabel>;
}

function statusText(proof: Proof) {
  const label = STATUS_LABEL[proof.status] || proof.status;
  return proof.kind === "DONATION" && proof.amount ? `${label} — ${proof.amount} أوقية` : label;
}

export default function ProofCard({
  proof,
  members,
  activities,
  financeTags,
  busy,
  onReview,
  onDelete,
  onLink,
  onPatch,
}: {
  proof: Proof;
  members: MemberOption[];
  activities: ActivityOption[];
  financeTags: FinanceTag[];
  busy: boolean;
  onReview: (status: "ACTIVE" | "REJECTED") => void;
  onDelete: () => void;
  onLink: (memberId: string | null) => void;
  onPatch: (changes: Partial<Proof>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [linking, setLinking] = useState(false);
  const isDonation = proof.kind === "DONATION";
  const reuseKind = REUSE_KIND[proof.kind];

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        <ProofThumb proof={proof.proof} alt={proof.memberName} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
              {proof.memberName}
            </p>
            <span className={`badge ${STATUS_CLASS[proof.status] || "badge-pending"}`}>
              {statusText(proof)}
            </span>
            {isDonation && proof.memberId && (
              <span className="badge badge-active">
                <IconLabel name="link" size={11}>
                  مرتبط بعضو
                </IconLabel>
              </span>
            )}
          </div>

          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            <Origin proof={proof} />
          </p>

          {isDonation && proof.donorPhone && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }} dir="ltr">
              <Icon name="phone" size={13} className="icon-inline" /> {proof.donorPhone}
            </p>
          )}

          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            رُفعت بتاريخ {formatDate(proof.uploadedAt)}
            {" — "}
            {formatTime(proof.uploadedAt)}
          </p>

          {reuseKind && <ProofReuseWarning filename={proof.proof} kind={reuseKind} id={proof.id} />}

          {isDonation && (
            <>
              <div className="mt-2">
                <DonationTags
                  donationId={proof.id}
                  tags={proof.tags ?? []}
                  allTags={financeTags}
                  onSaved={(tags) => onPatch({ tags })}
                />
              </div>

              <DonationActions
                proof={proof}
                busy={busy}
                onReview={onReview}
                onEdit={() => setEditing(true)}
                onDelete={onDelete}
                onLink={() => setLinking((p) => !p)}
                onUnlink={() => onLink(null)}
              />

              {editing && (
                <DonationEditForm
                  proof={proof}
                  activities={activities}
                  onCancel={() => setEditing(false)}
                  onSaved={(changes) => {
                    onPatch(changes);
                    setEditing(false);
                  }}
                />
              )}

              {linking && (
                <LinkMemberPanel
                  members={members}
                  busy={busy}
                  onPick={(memberId) => {
                    onLink(memberId);
                    setLinking(false);
                  }}
                />
              )}
            </>
          )}

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs font-bold mt-2"
            style={{ color: "var(--mint-700)" }}
          >
            <IconLabel name="list">السجل</IconLabel>
          </button>
          {showHistory && (
            <RecordHistory targetType={HISTORY_TARGET[proof.kind]} targetId={proof.id} />
          )}
        </div>
      </div>
    </div>
  );
}
