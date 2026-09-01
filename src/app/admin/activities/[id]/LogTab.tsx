"use client";

import IconLabel from "@/components/IconLabel";
import { auditActionLabel } from "@/lib/auditLabels";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";
import { activityLog as texts } from "@/lib/texts";

function day(value: string | null | undefined): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "—";
}

export default function LogTab({ history }: { history: ActivityDetail["history"] }) {
  return (
    <div className="card p-4">
      <p className="text-sm font-bold mb-3" style={{ color: "var(--text-main)" }}>
        <IconLabel name="list">{texts.heading}</IconLabel>
      </p>
      {history.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {history.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{auditActionLabel(h.action)}</span>
              <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                {h.adminUsername} · <span dir="ltr">{day(h.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
