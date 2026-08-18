import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

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
        <Link
          href="/admin/tools"
          className="text-xs font-bold flex items-center gap-1"
          style={{ color: "var(--mint-700)" }}
        >
          الأدوات
          <Icon name="chevronLeft" size={12} />
        </Link>
      </div>
    </div>
  );
}
