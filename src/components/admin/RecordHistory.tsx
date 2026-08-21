"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import AuditLogEntryCard from "./AuditLogEntryCard";
import type { AuditLogEntry } from "./auditLogTypes";
import type { HistoryTarget } from "@/app/api/admin/history/schema";

type Row = Pick<
  AuditLogEntry,
  "id" | "action" | "adminUsername" | "createdAt" | "targetLabel" | "before" | "after"
>;

export default function RecordHistory({
  targetType,
  targetId,
}: {
  targetType: HistoryTarget;
  targetId: string;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<{ history: Row[] }>(
        `/api/admin/history?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`,
      )
      .then((data) => {
        if (alive) setRows(data.history);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [targetType, targetId]);

  if (!rows) return null;

  return (
    <div className="mt-3">
      <p className="text-xs font-bold mb-2" style={{ color: "var(--text-main)" }}>
        <IconLabel name="list">سجل التغييرات ({rows.length})</IconLabel>
      </p>
      {rows.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لا تغييرات مسجلة
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <AuditLogEntryCard
              key={row.id}
              log={{
                ...row,
                adminRole: null,
                targetType,
                targetId,
                meta: null,
                ip: null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
