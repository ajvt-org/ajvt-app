import type { ReactNode } from "react";
import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";

export default function ProfileSection({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-4 space-y-2">
      <h2 className="font-black text-sm" style={{ color: "var(--text-main)" }}>
        <IconLabel name={icon}>{title}</IconLabel>
      </h2>
      {children}
    </section>
  );
}
