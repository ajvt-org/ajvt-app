import Icon, { type IconName } from "@/components/Icon";
import { paymentCard, PROOF_STATUS_LABEL } from "@/lib/texts";
import { STATUS_CLASS, type Proof } from "./paymentTypes";
import { isMembershipSurplus } from "./paymentsFilters";
import { money } from "@/lib/money";
import { splitPayment } from "@/lib/membershipPayment";

const STATUS_ICON: Record<string, IconName> = {
  PENDING: "clock",
  ACTIVE: "check",
  REJECTED: "close",
};

function Mark({ name, label, tone }: { name: IconName; label: string; tone: string }) {
  return (
    <span role="img" aria-label={label} title={label} className={`badge badge-mark ${tone}`}>
      <Icon name={name} size={13} />
    </span>
  );
}

export default function ProofBadges({ proof }: { proof: Proof }) {
  const isDonation = proof.kind === "DONATION";
  const status = PROOF_STATUS_LABEL[proof.status] || proof.status;

  return (
    <>
      <Mark
        name={STATUS_ICON[proof.status] ?? "clock"}
        label={status}
        tone={STATUS_CLASS[proof.status] || "badge-pending"}
      />
      {isDonation && proof.userId && (
        <Mark name="link" label={paymentCard.linked} tone="badge-active" />
      )}
      {isDonation && proof.anonymous && (
        <Mark name="eyeClosed" label={paymentCard.hiddenOnBoard} tone="badge-pending" />
      )}
      {isMembershipSurplus(proof) && (
        <Mark
          name="heart"
          label={paymentCard.membershipSurplus(
            money(splitPayment(proof.amount ?? 0, proof.feeApplied ?? 0).surplus),
          )}
          tone="badge-active"
        />
      )}
    </>
  );
}
