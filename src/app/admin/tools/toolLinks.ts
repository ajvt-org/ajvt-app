import type { IconName } from "@/components/Icon";
import { canOpen } from "@/lib/adminNav";

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
  { href: "/admin/deleted", label: "سلة المحذوفات", icon: "trash", superOnly: false },
];

export function toolsFor(role: string | null): ToolLink[] {
  return TOOL_LINKS.filter(
    (tool) => (!tool.superOnly || role === "SUPER") && (role === null || canOpen(role, tool.href)),
  );
}
