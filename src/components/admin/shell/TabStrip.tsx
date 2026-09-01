"use client";

import IconLabel from "@/components/IconLabel";
import CountBadge from "@/components/admin/CountBadge";
import { tabActive } from "@/lib/adminNav";
import type { NavTab } from "./navTabs";
import type { PendingCounts } from "./useAdminSession";

const BADGE_KEY: Record<string, keyof PendingCounts> = {
  "/admin/dashboard": "members",
  "/admin/activities": "activityWork",
  "/admin/payments": "donations",
};

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
      {tabs.map((tab) => {
        const key = BADGE_KEY[tab.href];
        return (
          <Tab
            key={tab.href}
            tab={tab}
            active={tabActive(tab.href, pathname)}
            count={key ? pending[key] : 0}
            onOpen={() => onOpen(tab.href)}
          />
        );
      })}
    </div>
  );
}
