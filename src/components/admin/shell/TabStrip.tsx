"use client";

import IconLabel from "@/components/IconLabel";
import CountBadge from "@/components/admin/CountBadge";
import { tabActiveFor, type NavTab } from "./navTabs";
import type { PendingCounts } from "./useAdminSession";

const BADGE_KEY: Record<string, keyof PendingCounts> = {
  "/admin/dashboard": "members",
  "/admin/activities": "activityWork",
  "/admin/payments": "donations",
};

function waitingOn(tab: NavTab, pending: PendingCounts): number {
  return (tab.tabs ?? [tab]).reduce((total, one) => {
    const key = BADGE_KEY[one.href];
    return total + (key ? pending[key] : 0);
  }, 0);
}

function Tab({
  tab,
  active,
  count,
  onOpen,
}: {
  tab: NavTab;
  active: boolean;
  count: number;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      aria-current={active ? "page" : undefined}
      className="text-xs sm:text-sm font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg relative"
      style={{
        background: active ? "var(--mint-700)" : "transparent",
        color: active ? "white" : "var(--text-main)",
      }}
    >
      <IconLabel name={tab.icon}>{tab.label}</IconLabel>
      <CountBadge count={count} />
    </button>
  );
}

export default function TabStrip({
  tabs,
  pathname,
  pending,
  onOpen,
}: {
  tabs: NavTab[];
  pathname: string | null;
  pending: PendingCounts;
  onOpen: (href: string) => void;
}) {
  return (
    <div
      className="tab-strip px-3 py-1.5 sm:px-4 sm:py-2"
      style={{ background: "white", borderBottom: "1px solid var(--mint-100)" }}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.label}
          tab={tab}
          active={tabActiveFor(tab, pathname)}
          count={waitingOn(tab, pending)}
          onOpen={() => onOpen(tab.href)}
        />
      ))}
    </div>
  );
}
