"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import { ouguiya, paymentCard, PROOF_STATUS_LABEL, RECEIPT_STATUS_LABEL } from "@/lib/texts";
import { linkedAccount } from "@/lib/linkedAccount";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import RecordHistory from "@/components/admin/RecordHistory";
import ProofReuseWarning from "@/components/admin/ProofReuseWarning";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import DonationTags from "./DonationTags";
import DonationActions from "./DonationActions";
import DonationEditForm from "./DonationEditForm";
import LinkMemberPanel from "./LinkMemberPanel";
import MemberIdentity from "./MemberIdentity";
import ProofThumb from "./ProofThumb";
import { HISTORY_TARGET, REUSE_KIND } from "./proofKinds";
import { STATUS_CLASS, type ActivityOption, type MemberOption, type Proof } from "./paymentTypes";

function Origin({ proof }: { proof: Proof }) {
  if (proof.kind === "MEMBERSHIP")
    return <IconLabel name="card">{paymentCard.membership}</IconLabel>;
  if (proof.activityTitle) return <IconLabel name="trophy">{proof.activityTitle}</IconLabel>;
  return <IconLabel name="heart">{paymentCard.generalSupport}</IconLabel>;
}

function ReceiptLine({ receipt }: { receipt: NonNullable<Proof["receipt"]> }) {
  const named = (
    <IconLabel name="receipt" size={13}>
      {paymentCard.receipt} <bdi>{receipt.number}</bdi>
    </IconLabel>
  );
  return (
    <p className="text-xs mt-0.5">
      {receipt.token ? (
        <Link
          href={`/receipt/${receipt.token}`}
          className="font-semibold"
          style={{ color: "var(--mint-700)" }}
        >
          {named}
        </Link>
      ) : (
        <span className="font-semibold">{named}</span>
      )}
      <span style={{ color: "var(--text-muted)" }}>
        {" · "}
        {RECEIPT_STATUS_LABEL[receipt.status] ?? receipt.status}
      </span>
    </p>
  );
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
  onLink: (userId: string | null) => void;
  onPatch: (changes: Partial<Proof>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [linking, setLinking] = useState(false);
  const isDonation = proof.kind === "DONATION";
  const linkedMember = linkedAccount(members, proof.userId);
  const reuseKind = REUSE_KIND[proof.kind];
  const stored = proof.donorName?.trim() || null;
  const showsStored = isDonation && stored !== null && stored !== proof.memberName;

  return (
    <div className="card p-3">
      <div className="flex items-start gap-3">
        <ProofThumb proof={proof.proof} alt={proof.memberName} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm min-w-0" style={{ color: "var(--text-main)" }}>
              {proof.memberName}
            </p>
            {isDonation && proof.amount != null && (
              <p className="font-bold text-sm shrink-0" style={{ color: "var(--mint-700)" }}>
                <bdi>{ouguiya.amount(proof.amount)}</bdi>
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className={`badge ${STATUS_CLASS[proof.status] || "badge-pending"}`}>
              {PROOF_STATUS_LABEL[proof.status] || proof.status}
            </span>
            {isDonation && proof.userId && (
              <span className="badge badge-active">
                <IconLabel name="link" size={11}>
                  {paymentCard.linked}
                </IconLabel>
              </span>
            )}
            {isDonation && proof.anonymous && (
              <span className="badge badge-pending">
                <IconLabel name="ban" size={11}>
                  {paymentCard.hiddenOnBoard}
                </IconLabel>
              </span>
            )}
          </div>

          {showsStored && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              <bdi>{paymentCard.storedName(stored)}</bdi>
            </p>
          )}

          {linkedMember && (
            <div className="mt-1.5">
              <MemberIdentity member={linkedMember} size={26} />
            </div>
          )}

          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            <Origin proof={proof} />
          </p>

          {isDonation && proof.donorPhone && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }} dir="ltr">
              <Icon name="phone" size={13} className="icon-inline" /> {proof.donorPhone}
            </p>
          )}

          {proof.receipt && <ReceiptLine receipt={proof.receipt} />}

          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {paymentCard.uploadedAt(formatDate(proof.uploadedAt), formatTime(proof.uploadedAt))}
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
                  linkedMember={linkedMember}
                  onCancel={() => setEditing(false)}
                  onRelink={() => setLinking(true)}
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
                  onPick={(userId) => {
                    onLink(userId);
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
            <IconLabel name="list">{paymentCard.history}</IconLabel>
          </button>
          {showHistory && (
            <RecordHistory targetType={HISTORY_TARGET[proof.kind]} targetId={proof.id} />
          )}
        </div>
      </div>
    </div>
  );
}
