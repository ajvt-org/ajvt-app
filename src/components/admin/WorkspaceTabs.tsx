"use client";

import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";

export interface WorkspaceTab {
  key: string;
  label: string;
  icon: IconName;
  badge?: number;
}

export interface WorkspaceSection {
  key: string;
  label: string;
  tabs: WorkspaceTab[];
}

export function sectionHolding(
  sections: WorkspaceSection[],
  active: string,
): WorkspaceSection | undefined {
  return sections.find((section) => section.tabs.some((tab) => tab.key === active));
}

export default function WorkspaceTabs({
  sections,
  active,
  onPick,
}: {
  sections: WorkspaceSection[];
  active: string;
  onPick: (key: string) => void;
}) {
  const current = sectionHolding(sections, active) ?? sections[0];
  if (!current) return null;

  return (
    <div className="space-y-1.5">
      <div className="tab-strip">
        {sections.map((section) => {
          const on = section.key === current.key;
          return (
            <button
              key={section.key}
              onClick={() => onPick(section.tabs[0].key)}
              aria-current={on ? "true" : undefined}
              className="text-xs sm:text-sm font-bold px-3 py-1 rounded-lg"
              style={{
                background: on ? "var(--mint-100)" : "transparent",
                color: on ? "var(--mint-700)" : "var(--text-muted)",
              }}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      <div className="tab-strip py-1.5">
        {current.tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => onPick(tab.key)}
              aria-current={on ? "page" : undefined}
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
                  style={{
                    background: "#dc2626",
                    fontSize: "9px",
                    minWidth: "16px",
                    height: "16px",
                  }}
                >
                  {tab.badge > 9 ? "+9" : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
