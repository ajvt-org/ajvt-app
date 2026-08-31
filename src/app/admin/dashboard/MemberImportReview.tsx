"use client";

import { memberImportDialog } from "@/lib/texts";
import type { RowValues } from "@/lib/memberImportValues";
import IconLabel from "@/components/IconLabel";
import MemberImportBulkFill from "./MemberImportBulkFill";
import MemberImportRow from "./MemberImportRow";
import { canImport, tally, type EditableRow } from "./memberImportState";

const HEAD = "px-1.5 py-1.5 text-right text-[11px] font-bold whitespace-nowrap";

export default function MemberImportReview({
  rows,
  villages,
  ageGroups,
  paymentMethods,
  notice,
  error,
  loading,
  onEdit,
  onSkip,
  onSelect,
  onSelectMissing,
  onClear,
  onFillAgeGroup,
  onBack,
  onImport,
}: {
  rows: EditableRow[];
  villages: string[];
  ageGroups: string[];
  paymentMethods: readonly string[];
  notice: string;
  error: string;
  loading: boolean;
  onEdit: (row: number, change: Partial<RowValues>) => void;
  onSkip: (row: number) => void;
  onSelect: (row: number, selected: boolean) => void;
  onSelectMissing: () => void;
  onClear: () => void;
  onFillAgeGroup: (age: string) => void;
  onBack: () => void;
  onImport: () => void;
}) {
  const counted = tally(rows);
  const selected = rows.filter((row) => row.selected).length;
  const ready = canImport(rows);

  return (
    <div className="space-y-3">
      {notice && (
        <p
          className="p-2.5 rounded-xl text-xs font-semibold"
          style={{ background: "#fef3c7", color: "#92400e" }}
        >
          <IconLabel name="warning">{notice}</IconLabel>
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <span className="badge badge-active">{memberImportDialog.rowsReady(counted.ready)}</span>
        {counted.blocked > 0 && (
          <span className="badge badge-rejected">
            {memberImportDialog.rowsBlocked(counted.blocked)}
          </span>
        )}
        {counted.skipped > 0 && (
          <span className="badge badge-pending">
            {memberImportDialog.rowsSkipped(counted.skipped)}
          </span>
        )}
      </div>

      <MemberImportBulkFill
        ageGroups={ageGroups}
        selected={selected}
        onSelectMissing={onSelectMissing}
        onClear={onClear}
        onApply={onFillAgeGroup}
      />

      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--mint-200)" }}>
        <table className="w-full border-collapse">
          <thead style={{ background: "var(--mint-100)" }}>
            <tr style={{ color: "var(--mint-700)" }}>
              <th className={HEAD}>{memberImportDialog.columnRow}</th>
              <th className={HEAD}>{memberImportDialog.columnName}</th>
              <th className={HEAD}>{memberImportDialog.columnPhone}</th>
              <th className={HEAD}>{memberImportDialog.columnVillage}</th>
              <th className={HEAD}>{memberImportDialog.columnAge}</th>
              <th className={HEAD}>{memberImportDialog.columnPaid}</th>
              <th className={HEAD}>{memberImportDialog.columnMethod}</th>
              <th className={HEAD}>{memberImportDialog.columnAmount}</th>
              <th className={HEAD}>{memberImportDialog.columnSkip}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <MemberImportRow
                key={row.row}
                row={row}
                villages={villages}
                ageGroups={ageGroups}
                paymentMethods={paymentMethods}
                onEdit={(change) => onEdit(row.row, change)}
                onSkip={() => onSkip(row.row)}
                onSelect={(value) => onSelect(row.row, value)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onImport}
          disabled={!ready || loading}
          className="btn btn-primary text-sm flex-1"
        >
          {loading ? "..." : memberImportDialog.importAll}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="btn text-sm"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {memberImportDialog.back}
        </button>
      </div>

      {!ready && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {counted.blocked > 0
            ? memberImportDialog.importBlocked
            : memberImportDialog.nothingToImport}
        </p>
      )}
    </div>
  );
}
