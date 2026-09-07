import IconLabel from "@/components/IconLabel";
import AdminBackLink from "./AdminBackLink";
import { adminTools } from "@/lib/texts";
import { toolAt, type ToolHref } from "@/lib/toolLinks";

export default function AdminToolHeader({ href, note }: { href: ToolHref; note?: string }) {
  const tool = toolAt(href);

  return (
    <div className="flex items-center gap-3">
      <AdminBackLink href="/admin/tools">{adminTools.backToTools}</AdminBackLink>
      <p className="text-sm font-bold min-w-0" style={{ color: "var(--text-main)" }}>
        <IconLabel name={tool.icon}>{tool.label}</IconLabel>
      </p>
      {note && (
        <span className="text-xs shrink-0 ms-auto" style={{ color: "var(--text-muted)" }}>
          {note}
        </span>
      )}
    </div>
  );
}
