"use client";

import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";
import { quizTabs } from "@/lib/texts";

export const QUIZ_TABS = [
  { key: "competitions", label: quizTabs.competitions, icon: "trophy" },
  { key: "bank", label: quizTabs.bank, icon: "list" },
  { key: "settings", label: quizTabs.settings, icon: "gear" },
] as const;

export type QuizTab = (typeof QUIZ_TABS)[number]["key"];

export function isQuizTab(value: string | null): value is QuizTab {
  return QUIZ_TABS.some((tab) => tab.key === value);
}

export default function QuizTabs({
  active,
  onSelect,
}: {
  active: QuizTab;
  onSelect: (tab: QuizTab) => void;
}) {
  return (
    <div className="tab-strip" role="tablist">
      {QUIZ_TABS.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onSelect(tab.key)}
          className="btn btn-sm font-bold"
          style={
            active === tab.key
              ? { background: "var(--mint-600)", color: "white" }
              : { background: "var(--surface-2)", color: "var(--text-main)" }
          }
        >
          <IconLabel name={tab.icon as IconName}>{tab.label}</IconLabel>
        </button>
      ))}
    </div>
  );
}
