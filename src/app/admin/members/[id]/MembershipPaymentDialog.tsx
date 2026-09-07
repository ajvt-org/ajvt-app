"use client";

import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import Money from "@/components/Money";
import Sheet from "@/components/Sheet";
import MembershipActions from "@/app/admin/payments/MembershipActions";
import { formatDate, formatTime, toThumbUrl } from "@/lib/utils";
import { membershipState, type StatefulMembership } from "@/lib/membershipState";
import { membershipSummary as texts, paymentCard } from "@/lib/texts";
import type { MemberProfile } from "@/components/admin/profileTypes";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd className="font-bold">{children}</dd>
    </div>
  );
}

export default function MembershipPaymentDialog({
  member,
  currentYear,
  onChanged,
  onClose,
}: {
  member: MemberProfile["member"];
  currentYear: number;
  onChanged: () => void;
  onClose: () => void;
}) {
  const state = membershipState(
    {
      status: member.status as StatefulMembership["status"],
      membershipYear: member.membershipYear,
      endedAt: member.endedAt,
    },
    currentYear,
  );
  const paid = (member.paidAmount ?? 0) + member.supportAmount;

  return (
    <Sheet onClose={onClose}>
      <DialogHeader
        title={<IconLabel name="card">{texts.paymentTitle}</IconLabel>}
        onClose={onClose}
      />

      <div className="p-5 space-y-3">
        {member.paymentProof ? (
          <a
            href={`/api/files/${member.paymentProof}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block space-y-1"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={toThumbUrl(`/api/files/${member.paymentProof}`)}
              alt={member.fullName}
              loading="lazy"
              decoding="async"
              className="w-full max-h-56 object-contain rounded-lg"
              style={{ background: "#f3f4f6", border: "1px solid var(--mint-100)" }}
            />
            <span
              className="block text-xs font-bold text-center"
              style={{ color: "var(--mint-700)" }}
            >
              {texts.viewProof}
            </span>
          </a>
        ) : (
          <p className="card p-3 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            {texts.noProof}
          </p>
        )}

        <dl className="text-sm space-y-1">
          <Row label={texts.standing}>{texts.states[state]}</Row>
          <Row label={texts.year}>
            <span dir="ltr">{member.membershipYear}</span>
          </Row>
          {member.paidAmount !== null && (
            <Row label={texts.amount}>
              <Money value={paid} />
            </Row>
          )}
        </dl>

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {paymentCard.uploadedAt(formatDate(member.updatedAt), formatTime(member.updatedAt))}
        </p>

        <MembershipActions
          userId={member.id}
          memberName={member.fullName}
          proof={member.paymentProof}
          status={member.status}
          onChanged={onChanged}
        />
      </div>
    </Sheet>
  );
}
