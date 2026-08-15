"use client";

import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
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
        <DialogHeader title={<IconLabel name="list">سجل الإجراءات</IconLabel>} onBack={onBack} />

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
