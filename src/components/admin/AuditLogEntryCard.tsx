"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { auditActionLabel } from "@/lib/auditLabels";
import { auditDiff } from "@/lib/auditDiff";
import { auditFieldLabel, auditTargetLabel, auditValueLabel } from "@/lib/auditFields";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogEntry } from "./auditLogTypes";

// The header is what every row has had since the log existed. Everything the
// snapshot columns added sits behind the toggle, because most rows are read
// as a list and only one at a time is read as a question.
export default function AuditLogEntryCard({ log }: { log: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const changes = auditDiff(log.before, log.after);
  const hasDetails = changes.length > 0 || Boolean(log.targetType) || Boolean(log.ip);

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
          {auditActionLabel(log.action)}
        </p>
        <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }} dir="ltr">
          {formatDateTime(log.createdAt)}
        </span>
      </div>

      {log.targetLabel && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {log.targetLabel}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-1">
        <p className="text-xs font-semibold" style={{ color: "var(--mint-600)" }}>
          بواسطة {log.adminUsername}
          {log.adminRole && ` · ${auditValueLabel(log.adminRole)}`}
        </p>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-xs font-bold shrink-0 flex items-center gap-1"
            style={{ color: "var(--mint-600)" }}
          >
            {open ? "إخفاء" : "التفاصيل"}
            <Icon name={open ? "chevronDown" : "chevronLeft"} size={12} />
          </button>
        )}
      </div>

      {open && (
        <div
          className="mt-2 p-2.5 rounded-lg space-y-1.5 text-xs"
          style={{ background: "var(--mint-50)" }}
        >
          {log.targetType && (
            <p style={{ color: "var(--text-muted)" }}>النوع: {auditTargetLabel(log.targetType)}</p>
          )}
          {changes.map((change) => (
            <div key={change.key} className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold" style={{ color: "var(--text-main)" }}>
                {auditFieldLabel(change.key)}
              </span>
              <span style={{ color: "var(--text-muted)" }}>{auditValueLabel(change.from)}</span>
              <Icon name="chevronLeft" size={11} />
              <span className="font-bold" style={{ color: "var(--mint-700)" }}>
                {auditValueLabel(change.to)}
              </span>
            </div>
          ))}
          {log.ip && (
            <p dir="ltr" className="text-start" style={{ color: "var(--text-muted)" }}>
              {log.ip}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
