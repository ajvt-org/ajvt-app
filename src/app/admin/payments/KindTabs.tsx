"use client";

import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";
import { PAYMENT_KIND_LABEL } from "@/lib/texts";
import type { ProofKind } from "./paymentTypes";

export type KindFilter = "ALL" | ProofKind;

const TABS: { key: KindFilter; icon?: IconName }[] = [
  { key: "ALL" },
  { key: "MEMBERSHIP", icon: "card" },
  { key: "ACTIVITY", icon: "trophy" },
  { key: "DONATION", icon: "heart" },
];

export default function KindTabs({
  active,
  onPick,
}: {
  active: KindFilter;
  onPick: (kind: KindFilter) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onPick(tab.key)}
          className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
          style={{
            background: active === tab.key ? "var(--mint-600)" : "var(--mint-100)",
            color: active === tab.key ? "white" : "var(--mint-700)",
          }}
        >
          {tab.icon ? (
            <IconLabel name={tab.icon}>{PAYMENT_KIND_LABEL[tab.key]}</IconLabel>
          ) : (
            PAYMENT_KIND_LABEL[tab.key]
          )}
        </button>
      ))}
    </div>
  );
}
