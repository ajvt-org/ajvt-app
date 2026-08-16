import type { ReactNode } from "react";
import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";

export default function TournamentSection({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
        <IconLabel name={icon} size="1.1em">
          {title}
        </IconLabel>
      </h2>
      {children}
    </section>
  );
}
