"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import RecordHistory from "@/components/admin/RecordHistory";
import { paymentCard } from "@/lib/texts";
import { HISTORY_TARGET } from "./proofKinds";
import type { ProofKind } from "./paymentTypes";

export default function PaymentHistory({ kind, id }: { kind: ProofKind; id: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-bold self-start"
        style={{ color: "var(--mint-700)" }}
      >
        <IconLabel name="list">{paymentCard.history}</IconLabel>
      </button>
      {open && <RecordHistory targetType={HISTORY_TARGET[kind]} targetId={id} />}
    </>
  );
}
