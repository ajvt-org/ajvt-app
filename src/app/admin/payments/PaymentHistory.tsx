"use client";

import IconLabel from "@/components/IconLabel";
import Disclosure from "@/components/admin/Disclosure";
import RecordHistory from "@/components/admin/RecordHistory";
import { MINT_SURFACE } from "@/components/admin/verbTones";
import { paymentCard } from "@/lib/texts";
import { HISTORY_TARGET } from "./proofKinds";
import type { ProofKind } from "./paymentTypes";

export default function PaymentHistory({ kind, id }: { kind: ProofKind; id: string }) {
  return (
    <Disclosure
      className="rounded-xl px-3 py-2.5 text-xs"
      surface={MINT_SURFACE}
      color="var(--mint-700)"
      title={
        <IconLabel name="list" size={14}>
          {paymentCard.history}
        </IconLabel>
      }
    >
      <RecordHistory targetType={HISTORY_TARGET[kind]} targetId={id} />
    </Disclosure>
  );
}
