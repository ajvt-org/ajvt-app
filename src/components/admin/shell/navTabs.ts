import type { IconName } from "@/components/Icon";
import { adminTabs } from "@/lib/texts";

export interface NavTab {
  href: string;
  label: string;
  icon: IconName;
}

export const NAV_TABS: NavTab[] = [
  { href: "/admin/dashboard", label: adminTabs.members, icon: "users" },
  { href: "/admin/activities", label: adminTabs.activities, icon: "trophy" },
  { href: "/admin/payments", label: adminTabs.payments, icon: "receipt" },
  { href: "/admin/receipts", label: adminTabs.receipts, icon: "receipt" },
  { href: "/admin/expenses", label: adminTabs.expenses, icon: "banknote" },
  { href: "/admin/treasury", label: adminTabs.treasury, icon: "wallet" },
  { href: "/admin/finance-report", label: adminTabs.financeReport, icon: "file" },
  { href: "/admin/quiz", label: adminTabs.quiz, icon: "quiz" },
  { href: "/admin/stats", label: adminTabs.stats, icon: "chart" },
  { href: "/admin/settings", label: adminTabs.settings, icon: "gear" },
  { href: "/admin/tools", label: adminTabs.tools, icon: "shield" },
];
