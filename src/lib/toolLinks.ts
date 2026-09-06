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

const TOOLS = {
  "/admin/password": { label: adminTools.password, icon: "lock", superOnly: false },
  "/admin/admins": { label: adminTools.admins, icon: "users", superOnly: true },
  "/admin/audit-log": { label: adminTools.auditLog, icon: "list", superOnly: true },
  "/admin/broadcast": { label: adminTools.broadcast, icon: "megaphone", superOnly: true },
  "/admin/deleted": { label: adminTools.deleted, icon: "trash", superOnly: false },
} satisfies Record<string, Omit<ToolLink, "href">>;

export type ToolHref = keyof typeof TOOLS;

export function toolAt(href: ToolHref): ToolLink {
  return { href, ...TOOLS[href] };
}

export const TOOL_HREFS = Object.keys(TOOLS) as ToolHref[];

export const TOOL_LINKS: ToolLink[] = TOOL_HREFS.map(toolAt);

export function toolsFor(role: string | null): ToolLink[] {
  return TOOL_LINKS.filter(
    (tool) =>
      (!tool.superOnly || hasFullAccess(role)) && (role === null || canOpen(role, tool.href)),
  );
}
