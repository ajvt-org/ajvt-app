"use client";

import type { FilterTab } from "./types";

const TABS: FilterTab[] = ["ALL", "PENDING", "ACTIVE", "REJECTED"];

const TAB_LABEL: Record<FilterTab, string> = {
  ALL: "الكل",
  PENDING: "انتظار",
  ACTIVE: "مقبول",
  REJECTED: "مرفوض",
};

export default function StatTabs({
  active,
  counts,
  onPick,
}: {
  active: FilterTab;
  counts: Record<FilterTab, number>;
  onPick: (tab: FilterTab) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3 sm:mb-5">
      {TABS.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          className="rounded-xl py-2 px-1.5 sm:py-3 sm:px-2 text-center transition-all"
          style={{
            background: active === s ? "var(--mint-700)" : "white",
            color: active === s ? "white" : "var(--text-main)",
            boxShadow:
              active === s ? "0 2px 8px rgba(26,63,51,0.25)" : "0 1px 4px rgba(0,0,0,0.06)",
            border: active === s ? "none" : "1px solid var(--mint-100)",
          }}
        >
          <div className="text-lg sm:text-xl font-black leading-none mb-0.5">{counts[s]}</div>
          <div className="text-[11px] sm:text-xs font-semibold opacity-80">{TAB_LABEL[s]}</div>
        </button>
      ))}
    </div>
  );
}
