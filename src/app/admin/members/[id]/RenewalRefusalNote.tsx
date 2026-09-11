"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { refusalEndsWithTheFeeDecision, type RenewalRefusal } from "@/lib/renewal";
import { renewalRefusalMessage } from "@/lib/renewalMessages";
import { membershipSummary as texts } from "@/lib/texts";

export default function RenewalRefusalNote({
  refusal,
  onOpenPayment,
}: {
  refusal: NonNullable<RenewalRefusal>;
  onOpenPayment: () => void;
}) {
  return (
    <div className="space-y-2 mt-2">
      <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
        <Icon name="warning" size={13} className="icon-inline" /> {renewalRefusalMessage(refusal)}
      </p>
      {refusalEndsWithTheFeeDecision(refusal) && (
        <button onClick={onOpenPayment} className="btn btn-sm btn-ghost font-bold">
          <IconLabel name="card">{texts.toPayment}</IconLabel>
        </button>
      )}
    </div>
  );
}
