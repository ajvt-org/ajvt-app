import IconLabel from "@/components/IconLabel";
import AdminBackLink from "./AdminBackLink";
import { adminTools } from "@/lib/texts";
import { toolAt, type ToolHref } from "@/lib/toolLinks";

export default function AdminToolHeader({ href, note }: { href: ToolHref; note?: string }) {
  const tool = toolAt(href);

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name={tool.icon}>{tool.label}</IconLabel>
      </p>
      <div className="flex items-center gap-3 shrink-0">
        {note && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {note}
          </span>
        )}
        <AdminBackLink href="/admin/tools">{adminTools.backToTools}</AdminBackLink>
      </div>
    </div>
  );
}
