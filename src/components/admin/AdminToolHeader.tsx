import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export default function AdminToolHeader({ icon, title }: { icon: IconName; title: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name={icon}>{title}</IconLabel>
      </p>
      <Link
        href="/admin/tools"
        className="text-xs font-bold shrink-0 flex items-center gap-1"
        style={{ color: "var(--mint-700)" }}
      >
        الأدوات
        <Icon name="chevronLeft" size={12} />
      </Link>
    </div>
  );
}
