"use client";

import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";
import type { ProofKind } from "./paymentTypes";

export type KindFilter = "ALL" | ProofKind;

const TABS: { key: KindFilter; label: string; icon?: IconName }[] = [
  { key: "ALL", label: "الكل" },
  { key: "MEMBERSHIP", label: "انتساب", icon: "card" },
  { key: "ACTIVITY", label: "الأنشطة", icon: "trophy" },
  { key: "DONATION", label: "دعم", icon: "heart" },
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
          {tab.icon ? <IconLabel name={tab.icon}>{tab.label}</IconLabel> : tab.label}
        </button>
      ))}
    </div>
  );
}
