import type { ReactNode } from "react";
import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";

export default function ProfileSection({
  icon,
  title,
  badge,
  children,
}: {
  icon: IconName;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card p-4 space-y-2">
      <h2
        className="font-black text-sm flex flex-wrap items-center gap-2"
        style={{ color: "var(--text-main)" }}
      >
        <IconLabel name={icon}>{title}</IconLabel>
        {badge}
      </h2>
      {children}
    </section>
  );
}
