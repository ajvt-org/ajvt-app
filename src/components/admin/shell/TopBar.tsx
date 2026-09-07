"use client";

import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import { adminShell } from "@/lib/texts";
import TabStrip from "./TabStrip";
import type { NavTab } from "./navTabs";
import type { PendingCounts } from "./useAdminSession";

export default function TopBar({
  tabs,
  pathname,
  pending,
  onOpen,
  onLogout,
}: {
  tabs: NavTab[];
  pathname: string | null;
  pending: PendingCounts;
  onOpen: (href: string) => void;
  onLogout: () => void;
}) {
  return (
    <div
      className="px-2 py-1 sm:px-4 sm:py-1.5 flex items-center gap-2"
      style={{
        background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))",
        boxShadow: "0 2px 12px rgba(26,63,51,0.2)",
      }}
    >
      <Logo mark="symbol" size={24} className="shrink-0" />
      <p className="hidden md:block text-sm font-black text-white leading-none shrink-0">
        {adminShell.title}
      </p>

      <TabStrip tabs={tabs} pathname={pathname} pending={pending} onOpen={onOpen} />

      <button
        onClick={onLogout}
        aria-label={adminShell.logout}
        title={adminShell.logout}
        className="text-xs px-2 py-1.5 rounded-lg font-semibold shrink-0 flex items-center gap-1"
        style={{
          background: "rgba(239,68,68,0.2)",
          color: "#fca5a5",
          border: "1px solid rgba(239,68,68,0.3)",
        }}
      >
        <Icon name="logout" size={14} />
        <span className="hidden sm:inline">{adminShell.logout}</span>
      </button>
    </div>
  );
}
