"use client";

import IconLabel from "@/components/IconLabel";
import { auditFilterCount, NO_AUDIT_FILTERS, type AuditFilters } from "@/lib/auditFilters";
import { auditActionLabel } from "@/lib/auditLabels";
import { auditTargetLabel } from "@/lib/auditFields";

const SELECT = "input text-xs";
const SELECT_STYLE = { width: "auto" };

export default function AuditFilterRow({
  filters,
  admins,
  actions,
  targets,
  onChange,
}: {
  filters: AuditFilters;
  admins: string[];
  actions: string[];
  targets: string[];
  onChange: (next: AuditFilters) => void;
}) {
  const chosen = auditFilterCount(filters);

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <select
        value={filters.admin}
        onChange={(e) => onChange({ ...filters, admin: e.target.value })}
        className={SELECT}
        style={SELECT_STYLE}
        aria-label="تصفية حسب المشرف"
      >
        <option value="">كل المشرفين</option>
        {admins.map((admin) => (
          <option key={admin} value={admin}>
            {admin}
          </option>
        ))}
      </select>

      <select
        value={filters.action}
        onChange={(e) => onChange({ ...filters, action: e.target.value })}
        className={SELECT}
        style={SELECT_STYLE}
        aria-label="تصفية حسب الإجراء"
      >
        <option value="">كل الإجراءات</option>
        {actions.map((action) => (
          <option key={action} value={action}>
            {auditActionLabel(action)}
          </option>
        ))}
      </select>

      <select
        value={filters.target}
        onChange={(e) => onChange({ ...filters, target: e.target.value })}
        className={SELECT}
        style={SELECT_STYLE}
        aria-label="تصفية حسب النوع"
      >
        <option value="">كل الأنواع</option>
        {targets.map((target) => (
          <option key={target} value={target}>
            {auditTargetLabel(target)}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={filters.from}
        onChange={(e) => onChange({ ...filters, from: e.target.value })}
        className={SELECT}
        style={SELECT_STYLE}
        aria-label="من تاريخ"
      />
      <input
        type="date"
        value={filters.to}
        onChange={(e) => onChange({ ...filters, to: e.target.value })}
        className={SELECT}
        style={SELECT_STYLE}
        aria-label="إلى تاريخ"
      />

      {chosen > 0 && (
        <button
          onClick={() => onChange(NO_AUDIT_FILTERS)}
          className="text-xs font-bold"
          style={{ color: "var(--mint-700)" }}
        >
          <IconLabel name="close">إزالة التصفية ({chosen})</IconLabel>
        </button>
      )}
    </div>
  );
}
