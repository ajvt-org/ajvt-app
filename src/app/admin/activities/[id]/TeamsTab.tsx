"use client";

import Link from "next/link";
import IconLabel from "@/components/IconLabel";
import { counted } from "@/lib/arabicCount";
import { GROUP, MATCH, PLAYER } from "@/lib/messages";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";

export default function TeamsTab({ activity }: { activity: ActivityDetail["activity"] }) {
  const manageHref = `/admin/tournament/${activity.id}`;

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            <IconLabel name="trophy">مساحة البطولة</IconLabel>
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            الفرق والمجموعات والمباريات والنتائج تُدار من هناك.
          </p>
        </div>
        <Link href={manageHref} className="btn btn-sm btn-primary shrink-0">
          <IconLabel name="trophy">فتح مساحة البطولة</IconLabel>
        </Link>
      </div>

      <div className="card p-4">
        <p className="text-sm font-bold mb-3" style={{ color: "var(--text-main)" }}>
          <IconLabel name="shield">الفرق</IconLabel>
        </p>
        {activity.teams.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا توجد فرق بعد — تُنشأ الفرق من مساحة البطولة.
          </p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {activity.teams.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{t.name}</span>
                  <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                    {counted(t._count.members, PLAYER)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              {counted(activity._count.matches, MATCH)} · {counted(activity._count.groups, GROUP)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
