"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Money from "@/components/Money";
import { formatDayKey } from "@/lib/utils";
import { groupDayRecords, type DayRecord, type FinanceDay } from "./types";

const KINDS = ["دعم", "انتساب"] as const;

function MethodBlock({ method, items }: { method: string; items: DayRecord[] }) {
  const subtotal = items.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold" style={{ color: "var(--mint-700)" }}>
          {method}
        </span>
        <span className="font-bold" style={{ color: "var(--mint-600)" }}>
          <Money value={subtotal} />
        </span>
      </div>
      <div className="mr-2 mt-0.5 space-y-0.5">
        {items.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="truncate" style={{ color: "var(--text-muted)" }}>
              {r.name}
            </span>
            <span className="shrink-0" style={{ color: "var(--text-muted)" }}>
              <Money value={r.amount} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayDetail({ records }: { records: DayRecord[] }) {
  if (records.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        لا توجد تفاصيل
      </p>
    );
  }

  const grouped = groupDayRecords(records);

  return (
    <>
      {KINDS.map((kind) => {
        const methods = grouped[kind];
        const keys = Object.keys(methods);
        if (keys.length === 0) return null;
        return (
          <div key={kind}>
            <p className="text-xs font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              <IconLabel name={kind === "دعم" ? "heart" : "idCard"} size={11}>
                {kind}
              </IconLabel>
            </p>
            <div className="space-y-2 mr-2">
              {keys.map((method) => (
                <MethodBlock key={method} method={method} items={methods[method]} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function DailyRevenue({
  days,
  expanded,
  onToggle,
}: {
  days: FinanceDay[];
  expanded: Set<string>;
  onToggle: (date: string) => void;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
        الإيرادات اليومية (آخر 30 يوماً)
      </p>

      {days.length === 0 ? (
        <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
          لا توجد إيرادات في هذه الفترة
        </p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {days.map((day) => {
            const open = expanded.has(day.date);
            return (
              <div key={day.date}>
                <button
                  type="button"
                  onClick={() => onToggle(day.date)}
                  className="w-full flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Icon name={open ? "chevronDown" : "chevronLeft"} size={14} />
                    <span dir="ltr" style={{ color: "var(--text-main)" }}>
                      {formatDayKey(day.date)}
                    </span>
                  </span>
                  <span className="font-black" style={{ color: "var(--mint-600)" }}>
                    <Money value={day.total} />
                  </span>
                </button>

                {open && (
                  <div
                    className="mt-1.5 mr-4 space-y-3 p-2.5 rounded-lg"
                    style={{ background: "var(--mint-50)" }}
                  >
                    <DayDetail records={day.records} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
