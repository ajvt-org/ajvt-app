import type { IconName } from "@/components/Icon";
import { adminTabs } from "@/lib/texts";
import { MONEY_AREAS, canOpen, tabActive } from "@/lib/adminNav";

export interface NavTab {
  href: string;
  label: string;
  icon: IconName;
  tabs?: NavTab[];
}

const MONEY_TABS: NavTab[] = [
  { href: MONEY_AREAS.payments, label: adminTabs.payments, icon: "receipt" },
  { href: MONEY_AREAS.receipts, label: adminTabs.receipts, icon: "receipt" },
  { href: MONEY_AREAS.supporters, label: adminTabs.supporters, icon: "heart" },
  { href: MONEY_AREAS.expenses, label: adminTabs.expenses, icon: "banknote" },
  { href: MONEY_AREAS.treasury, label: adminTabs.treasury, icon: "wallet" },
  { href: MONEY_AREAS.report, label: adminTabs.financeReport, icon: "file" },
];

export const NAV_TABS: NavTab[] = [
  { href: "/admin/dashboard", label: adminTabs.members, icon: "users" },
  { href: "/admin/activities", label: adminTabs.activities, icon: "trophy" },
  { href: MONEY_AREAS.payments, label: adminTabs.money, icon: "card", tabs: MONEY_TABS },
  { href: "/admin/quiz", label: adminTabs.quiz, icon: "quiz" },
  { href: "/admin/stats", label: adminTabs.stats, icon: "chart" },
  { href: "/admin/settings", label: adminTabs.settings, icon: "gear" },
  { href: "/admin/tools", label: adminTabs.tools, icon: "shield" },
];

export function tabActiveFor(tab: NavTab, pathname: string | null): boolean {
  const owned = tab.tabs ?? [tab];
  return owned.some((one) => tabActive(one.href, pathname));
}

function opened(role: string | null, tab: NavTab): NavTab | null {
  if (!tab.tabs) return canOpen(role, tab.href) ? tab : null;
  const tabs = tab.tabs.filter((one) => canOpen(role, one.href));
  if (tabs.length === 0) return null;
  return { ...tab, href: tabs[0].href, tabs };
}

export function tabsFor(role: string | null): NavTab[] {
  return NAV_TABS.map((tab) => opened(role, tab)).filter((tab): tab is NavTab => tab !== null);
}

export function subtabsFor(role: string | null, pathname: string | null): NavTab[] {
  const holding = tabsFor(role).find((tab) => tab.tabs && tabActiveFor(tab, pathname));
  return holding?.tabs ?? [];
}
