import type { ReactNode } from "react";
import type { IconName } from "@/components/Icon";
import ProfileSection from "@/components/admin/ProfileSection";

export interface ProfileRow {
  key: string;
  main: ReactNode;
  aside: ReactNode;
}

export default function ProfileList({
  icon,
  title,
  empty,
  rows,
}: {
  icon: IconName;
  title: string;
  empty: string;
  rows: ProfileRow[];
}) {
  return (
    <ProfileSection icon={icon} title={title}>
      {rows.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {empty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{row.main}</span>
              <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                {row.aside}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ProfileSection>
  );
}
