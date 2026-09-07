"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import RecordHistory from "@/components/admin/RecordHistory";
import { MINT_SURFACE } from "@/components/admin/verbTones";
import { paymentCard } from "@/lib/texts";
import { HISTORY_TARGET } from "./proofKinds";
import type { ProofKind } from "./paymentTypes";

export default function PaymentHistory({ kind, id }: { kind: ProofKind; id: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl px-3 py-2.5 text-xs" style={MINT_SURFACE}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 font-black"
        style={{ color: "var(--mint-700)" }}
      >
        <IconLabel name="list" size={14}>
          {paymentCard.history}
        </IconLabel>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} />
      </button>
      {open && <RecordHistory targetType={HISTORY_TARGET[kind]} targetId={id} />}
    </div>
  );
}
