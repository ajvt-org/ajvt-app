"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { formatDate, formatTime } from "@/lib/utils";
import { paymentCard, RECEIPT_STATUS_LABEL } from "@/lib/texts";
import { donorNamesShown } from "@/lib/donorNamesShown";
import { donorPhoneShown } from "@/lib/donorPhoneShown";
import FinanceTagChips from "@/components/admin/FinanceTagChips";
import MemberIdentity from "./MemberIdentity";
import type { MemberOption, Proof } from "./paymentTypes";

function Origin({ proof }: { proof: Proof }) {
  if (proof.kind === "MEMBERSHIP")
    return <IconLabel name="card">{paymentCard.membership}</IconLabel>;
  if (proof.activityTitle) return <IconLabel name="trophy">{proof.activityTitle}</IconLabel>;
  if (proof.competitionName) return <IconLabel name="quiz">{proof.competitionName}</IconLabel>;
  return <IconLabel name="heart">{paymentCard.generalSupport}</IconLabel>;
}

function ReceiptLine({ receipt }: { receipt: NonNullable<Proof["receipt"]> }) {
  const named = (
    <IconLabel name="receipt" size={13}>
      {paymentCard.receipt} <bdi>{receipt.number}</bdi>
    </IconLabel>
  );
  return (
    <span>
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
    </span>
  );
}

export default function PaymentFacts({
  proof,
  linkedMember,
}: {
  proof: Proof;
  linkedMember?: MemberOption;
}) {
  const names = donorNamesShown(proof);
  const phone = donorPhoneShown(proof, linkedMember);
  const isDonation = proof.kind === "DONATION";

  return (
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs"
      style={{ color: "var(--text-muted)" }}
    >
      <span>
        <Origin proof={proof} />
      </span>

      <span>
        {paymentCard.uploadedAt(formatDate(proof.uploadedAt), formatTime(proof.uploadedAt))}
      </span>

      {linkedMember && (
        <span className="min-w-0 max-w-full shrink-0">
          <MemberIdentity member={linkedMember} size={26} showName={false} />
        </span>
      )}

      {isDonation && names.typed && <bdi>{paymentCard.storedName(names.typed)}</bdi>}

      {isDonation && phone && (
        <span dir="ltr">
          <Icon name="phone" size={13} className="icon-inline" /> {phone}
        </span>
      )}

      {proof.receipt && <ReceiptLine receipt={proof.receipt} />}

      {isDonation && proof.tags && proof.tags.length > 0 && <FinanceTagChips tags={proof.tags} />}
    </div>
  );
}
