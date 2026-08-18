import type { IconName } from "@/components/Icon";

export interface ToolLink {
  href: string;
  label: string;
  icon: IconName;
  superOnly: boolean;
}

export const TOOL_LINKS: ToolLink[] = [
  { href: "/admin/password", label: "تغيير كلمة المرور", icon: "lock", superOnly: false },
  { href: "/admin/admins", label: "إدارة حسابات المشرفين", icon: "users", superOnly: true },
  { href: "/admin/audit-log", label: "سجل الإجراءات", icon: "list", superOnly: true },
  { href: "/admin/broadcast", label: "إرسال إشعار جماعي", icon: "megaphone", superOnly: true },
];

export function toolsFor(role: string | null): ToolLink[] {
  if (role === null) return TOOL_LINKS.filter((tool) => !tool.superOnly);
  return TOOL_LINKS.filter((tool) => !tool.superOnly || role === "SUPER");
}
