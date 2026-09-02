import { hasFullAccess } from "@/lib/adminRoles";
import { adminTools } from "@/lib/texts";
import type { IconName } from "@/components/Icon";
import { canOpen } from "@/lib/adminNav";

export interface ToolLink {
  href: string;
  label: string;
  icon: IconName;
  superOnly: boolean;
}

export const TOOL_LINKS: ToolLink[] = [
  { href: "/admin/password", label: adminTools.password, icon: "lock", superOnly: false },
  { href: "/admin/admins", label: adminTools.admins, icon: "users", superOnly: true },
  { href: "/admin/audit-log", label: adminTools.auditLog, icon: "list", superOnly: true },
  { href: "/admin/broadcast", label: adminTools.broadcast, icon: "megaphone", superOnly: true },
  { href: "/admin/deleted", label: adminTools.deleted, icon: "trash", superOnly: false },
];

export function toolsFor(role: string | null): ToolLink[] {
  return TOOL_LINKS.filter(
    (tool) =>
      (!tool.superOnly || hasFullAccess(role)) && (role === null || canOpen(role, tool.href)),
  );
}
