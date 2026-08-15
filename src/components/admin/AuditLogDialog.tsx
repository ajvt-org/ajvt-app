"use client";

import DialogBack from "@/components/DialogBack";
import AuditLogEntryCard from "./AuditLogEntryCard";
import type { AuditLogEntry } from "./auditLogTypes";

export default function AuditLogDialog({
  logs,
  loading,
  onClose,
  onBack,
}: {
  logs: AuditLogEntry[];
  loading: boolean;
  onClose: () => void;
  onBack: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "88svh", direction: "rtl" }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between sticky top-0"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          <DialogBack onClick={onBack} />
          <h2 className="font-black text-white text-base">📜 سجل الإجراءات</h2>
        </div>

        <div className="p-5 space-y-2">
          {loading ? (
            <div className="text-center py-8" style={{ color: "var(--mint-500)" }}>
              ⏳
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
              لا يوجد سجل بعد
            </p>
          ) : (
            logs.map((log) => <AuditLogEntryCard key={log.id} log={log} />)
          )}
        </div>
      </div>
    </div>
  );
}
