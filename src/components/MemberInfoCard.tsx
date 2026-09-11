import IconLabel from "@/components/IconLabel";
import { formatDate } from "@/lib/clubTime";
import type { MemberData } from "@/lib/useMember";
import InfoRow from "@/components/InfoRow";
import PaidAmountRows from "@/components/PaidAmountRows";
import { membershipEnding, myProfile, villageField } from "@/lib/texts";
import { membershipState } from "@/lib/membershipState";

const texts = myProfile.details;

export default function MemberInfoCard({
  member,
  currentYear = null,
  onCard = false,
  onEdit,
}: {
  member: MemberData;
  currentYear?: number | null;
  onCard?: boolean;
  onEdit?: () => void;
}) {
  const state = membershipState(member, currentYear ?? member.membershipYear);
  const applying = state === "APPLIED" || state === "APPLICATION_REFUSED";
  const ended = state === "ENDED";

  return (
    <div className="card p-5">
      {onEdit && (
        <div
          className="flex items-center justify-end mb-3 pb-2"
          style={{ borderBottom: "1px solid var(--mint-100)" }}
        >
          <button
            onClick={onEdit}
            className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <IconLabel name="pencil">{texts.edit}</IconLabel>
          </button>
        </div>
      )}
      <div className="space-y-2.5">
        <InfoRow label={texts.phone} value={member.user?.phone ?? "—"} dir="ltr" />
        {!onCard && <InfoRow label={villageField.label} value={member.village} />}
        {!onCard && member.age && <InfoRow label={texts.age} value={member.age} />}
        {applying && (
          <>
            <InfoRow label={texts.paymentMethod} value={member.paymentMethod ?? "—"} />
            <PaidAmountRows
              paidAmount={member.paidAmount}
              supportAmount={member.supportAmount}
              Row={InfoRow}
            />
            <InfoRow
              label={texts.requestedOn}
              value={<bdi dir="ltr">{formatDate(member.createdAt)}</bdi>}
            />
          </>
        )}
        {!applying && (
          <InfoRow
            label={texts.acceptedOn}
            value={<bdi dir="ltr">{formatDate(member.updatedAt)}</bdi>}
          />
        )}
        {ended && member.endedAt && (
          <InfoRow
            label={membershipEnding.endedOn}
            value={<bdi dir="ltr">{formatDate(member.endedAt)}</bdi>}
          />
        )}
      </div>
    </div>
  );
}
