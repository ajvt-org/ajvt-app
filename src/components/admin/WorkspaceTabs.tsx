"use client";

import IconLabel from "@/components/IconLabel";
import CountBadge from "@/components/admin/CountBadge";
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

export function workWaiting(section: WorkspaceSection): number {
  return section.tabs.reduce((total, tab) => total + (tab.badge ?? 0), 0);
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
      {sections.length > 1 && (
        <div className="tab-strip">
          {sections.map((section) => {
            const on = section.key === current.key;
            return (
              <button
                key={section.key}
                onClick={() => onPick(section.tabs[0].key)}
                aria-current={on ? "true" : undefined}
                className="text-xs sm:text-sm font-bold px-3 py-1 rounded-lg relative"
                style={{
                  background: on ? "var(--mint-100)" : "transparent",
                  color: on ? "var(--mint-700)" : "var(--text-muted)",
                }}
              >
                {section.label}
                <CountBadge count={workWaiting(section)} />
              </button>
            );
          })}
        </div>
      )}

      <div className="tab-strip">
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
              <CountBadge count={tab.badge ?? 0} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
