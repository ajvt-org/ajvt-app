import IconLabel from "@/components/IconLabel";
import Money from "@/components/Money";
import { splitPayment } from "@/lib/membershipPayment";
import { paymentCard } from "@/lib/texts";
import type { Proof } from "./paymentTypes";

export default function MembershipSplit({ proof }: { proof: Proof }) {
  if (proof.kind !== "MEMBERSHIP" || proof.amount == null) return null;

  const { fee, surplus } = splitPayment(proof.amount, proof.feeApplied ?? 0);
  if (surplus === 0) return null;

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <IconLabel name="card">
        {proof.year == null ? paymentCard.fee : paymentCard.feeForYear(proof.year)}{" "}
        <Money value={fee} />
      </IconLabel>
      <IconLabel name="heart">
        {paymentCard.aboveFee} <Money value={surplus} />
      </IconLabel>
    </span>
  );
}
