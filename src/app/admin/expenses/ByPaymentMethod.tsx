"use client";

import Icon from "@/components/Icon";
import type { MethodDetail, NamedEntry } from "./types";

function EntryList({ title, entries }: { title: string; entries: NamedEntry[] }) {
  return (
    <div>
      <p className="text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>
        {title}
      </p>
      {entries.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لا يوجد
        </p>
      ) : (
        <div className="space-y-0.5">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="truncate" style={{ color: "var(--text-main)" }}>
                {i + 1}. {entry.name}
              </span>
              <span className="font-bold shrink-0" style={{ color: "var(--mint-600)" }}>
                {entry.amount} أوقية
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ detail }: { detail: MethodDetail }) {
  return (
    <div
      className="mt-2 mr-4 space-y-2.5 p-2.5 rounded-lg"
      style={{ background: "var(--mint-50)" }}
    >
      <EntryList title="1- انتساب" entries={detail.intisab} />
      <EntryList title="2- دعم" entries={detail.daem} />
      {detail.anonymousTotal > 0 && (
        <div
          className="flex items-center justify-between text-xs pt-1.5"
          style={{ borderTop: "1px solid var(--mint-100)" }}
        >
          <span style={{ color: "var(--text-muted)" }}>فاعل خير</span>
          <span className="font-bold shrink-0" style={{ color: "var(--text-muted)" }}>
            {detail.anonymousTotal} أوقية
          </span>
        </div>
      )}
    </div>
  );
}

export default function ByPaymentMethod({
  byMethod,
  details,
  expanded,
  onToggle,
}: {
  byMethod: [string, number][];
  details: Record<string, MethodDetail>;
  expanded: Set<string>;
  onToggle: (method: string) => void;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
        حسب طريقة الدفع (كل الإيرادات)
      </p>

      {byMethod.length === 0 ? (
        <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
          لا توجد بيانات بعد
        </p>
      ) : (
        <div className="space-y-2">
          {byMethod.map(([method, total]) => {
            const open = expanded.has(method);
            const detail = details?.[method];
            return (
              <div key={method}>
                <button
                  type="button"
                  onClick={() => onToggle(method)}
                  className="w-full flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Icon name={open ? "chevronDown" : "chevronLeft"} size={14} />
                    <span style={{ color: "var(--text-main)" }} className="font-bold truncate">
                      {method}
                    </span>
                  </span>
                  <span className="font-black shrink-0" style={{ color: "var(--mint-600)" }}>
                    {total} أوقية
                  </span>
                </button>
                {open && detail && <Detail detail={detail} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
