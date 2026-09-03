import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";

export default function StatTile({
  icon,
  label,
  children,
  color = "var(--text-main)",
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        <IconLabel name={icon}>{label}</IconLabel>
      </p>
      <span className="text-base font-black" style={{ color }}>
        {children}
      </span>
    </div>
  );
}
