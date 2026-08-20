"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import type { CompetitionRow } from "./competitionTypes";
import { countedNoun, ROUNDS } from "@/lib/arabicPlural";

export default function CompetitionList({
  rows,
  selectedId,
  onSelect,
  onCreate,
}: {
  rows: CompetitionRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="trophy">المسابقات</IconLabel>
        </p>
        <button onClick={onCreate} className="btn btn-primary btn-sm text-xs">
          <IconLabel name="plus">مسابقة جديدة</IconLabel>
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لا توجد مسابقة بعد
        </p>
      )}

      <div className="space-y-1.5">
        {rows.map((row) => {
          const active = row.id === selectedId;
          return (
            <button
              key={row.id}
              onClick={() => onSelect(row.id)}
              className="w-full text-start rounded-lg p-2 flex items-center gap-2"
              style={{
                background: active ? "var(--mint-100)" : "var(--surface-2)",
                border: `1px solid ${active ? "var(--mint-500)" : "transparent"}`,
              }}
            >
              <Icon name={row.visibility === "PRIVATE" ? "lock" : "users"} size={14} />
              <span className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
                {row.name}
              </span>
              <span className="text-xs ms-auto" style={{ color: "var(--text-muted)" }}>
                {row.startedAt ? "انطلقت" : "لم تنطلق"} · {row._count.rounds} من{" "}
                {countedNoun(row.roundCount, ROUNDS)}
                {row.visibility === "PRIVATE" ? ` · ${row._count.participants} مشاركاً` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
