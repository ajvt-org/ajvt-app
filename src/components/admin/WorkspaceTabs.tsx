"use client";

import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";

export interface WorkspaceTab {
  key: string;
  label: string;
  icon: IconName;
  badge?: number;
}

export default function WorkspaceTabs({
  tabs,
  active,
  onPick,
}: {
  tabs: WorkspaceTab[];
  active: string;
  onPick: (key: string) => void;
}) {
  return (
    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onPick(tab.key)}
            className="text-xs sm:text-sm font-bold px-3 py-2 rounded-xl relative"
            style={{
              background: on ? "var(--mint-700)" : "white",
              color: on ? "white" : "var(--text-main)",
              border: on ? "none" : "1px solid var(--mint-100)",
            }}
          >
            <IconLabel name={tab.icon}>{tab.label}</IconLabel>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                dir="ltr"
                className="absolute -top-1.5 -start-1.5 rounded-full text-white font-black flex items-center justify-center"
                style={{ background: "#dc2626", fontSize: "9px", minWidth: "16px", height: "16px" }}
              >
                {tab.badge > 9 ? "+9" : tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
