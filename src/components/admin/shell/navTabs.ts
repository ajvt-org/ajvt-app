import type { IconName } from "@/components/Icon";

export interface NavTab {
  href: string;
  label: string;
  icon: IconName;
}

export const NAV_TABS: NavTab[] = [
  { href: "/admin/dashboard", label: "المستخدمون", icon: "users" },
  { href: "/admin/activities", label: "الأنشطة", icon: "trophy" },
  { href: "/admin/payments", label: "المدفوعات", icon: "receipt" },
  { href: "/admin/expenses", label: "المصاريف", icon: "banknote" },
  { href: "/admin/treasury", label: "الخزينة", icon: "wallet" },
  { href: "/admin/finance-report", label: "التقرير المالي", icon: "file" },
  { href: "/admin/quiz", label: "المسابقات الثقافية", icon: "quiz" },
  { href: "/admin/stats", label: "الإحصائيات", icon: "chart" },
  { href: "/admin/settings", label: "الإعدادات", icon: "gear" },
  { href: "/admin/tools", label: "أدوات المشرف", icon: "shield" },
];
