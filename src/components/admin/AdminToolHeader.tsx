import { type IconName } from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import AdminBackLink from "./AdminBackLink";
import { adminTools } from "@/lib/texts";

export default function AdminToolHeader({
  icon,
  title,
  note,
}: {
  icon: IconName;
  title: string;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name={icon}>{title}</IconLabel>
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
