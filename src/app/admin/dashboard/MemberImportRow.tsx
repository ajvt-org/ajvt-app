"use client";

import { memberImportDialog } from "@/lib/texts";
import { requiresAgeGroup } from "@/lib/villages";
import type { RowValues } from "@/lib/memberImportValues";
import Icon from "@/components/Icon";
import { isRowBlocked, type EditableRow } from "./memberImportState";

const CELL = "px-1.5 py-1 align-top";

function Problems({ row }: { row: EditableRow }) {
  if (row.issues.length === 0) return null;
  return (
    <ul className="text-[11px] leading-tight space-y-0.5 mt-1">
      {row.issues.map((issue, at) => (
        <li key={at} style={{ color: issue.blocking ? "#991b1b" : "var(--text-muted)" }}>
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

export default function MemberImportRow({
  row,
  villages,
  ageGroups,
  paymentMethods,
  onEdit,
  onSkip,
  onSelect,
}: {
  row: EditableRow;
  villages: string[];
  ageGroups: string[];
  paymentMethods: readonly string[];
  onEdit: (change: Partial<RowValues>) => void;
  onSkip: () => void;
  onSelect: (selected: boolean) => void;
}) {
  const blocked = isRowBlocked(row);
  const match = row.match;

  return (
    <tr
      style={{
        background: row.skip ? "var(--mint-50)" : blocked ? "#fef2f2" : "white",
        opacity: row.skip ? 0.55 : 1,
      }}
    >
      <td className={CELL}>
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            aria-label={memberImportDialog.selectRow}
            checked={row.selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
            {row.row}
          </span>
        </div>
      </td>

      <td className={CELL}>
        <input
          aria-label={`${memberImportDialog.columnName} ${row.row}`}
          value={row.values.fullName}
          onChange={(e) => onEdit({ fullName: e.target.value })}
          maxLength={30}
          className="input text-xs py-1"
          style={{ minWidth: "9rem" }}
        />
        {match && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--mint-700)" }}>
            {match.kind === "phone"
              ? memberImportDialog.matchPhone(match.fullName ?? "")
              : memberImportDialog.matchName(match.fullName ?? "")}
          </p>
        )}
        <Problems row={row} />
      </td>

      <td className={CELL}>
        <input
          aria-label={`${memberImportDialog.columnPhone} ${row.row}`}
          value={row.values.phone}
          dir="ltr"
          onChange={(e) => onEdit({ phone: e.target.value.replace(/\D/g, "").slice(0, 8) })}
          className="input text-xs py-1"
          style={{ minWidth: "6rem" }}
        />
      </td>

      <td className={CELL}>
        <select
          aria-label={`${memberImportDialog.columnVillage} ${row.row}`}
          value={villages.includes(row.values.village) ? row.values.village : ""}
          onChange={(e) => onEdit({ village: e.target.value })}
          className="input text-xs py-1"
          style={{ minWidth: "7rem" }}
        >
          <option value="" disabled>
            {row.values.village}
          </option>
          {villages.map((village) => (
            <option key={village} value={village}>
              {village}
            </option>
          ))}
        </select>
      </td>

      <td className={CELL}>
        {requiresAgeGroup(row.values.village) ? (
          <select
            aria-label={`${memberImportDialog.columnAge} ${row.row}`}
            value={ageGroups.includes(row.values.age) ? row.values.age : ""}
            onChange={(e) => onEdit({ age: e.target.value })}
            className="input text-xs py-1"
            style={{ minWidth: "7rem" }}
          >
            <option value="" disabled>
              {row.values.age}
            </option>
            {ageGroups.map((age) => (
              <option key={age} value={age}>
                {age}
              </option>
            ))}
          </select>
        ) : null}
      </td>

      <td className={CELL}>
        <input
          type="checkbox"
          aria-label={`${memberImportDialog.columnPaid} ${row.row}`}
          checked={row.values.paid}
          onChange={(e) => onEdit({ paid: e.target.checked })}
          className="w-4 h-4"
        />
      </td>

      <td className={CELL}>
        {row.values.paid && (
          <select
            aria-label={`${memberImportDialog.columnMethod} ${row.row}`}
            value={
              paymentMethods.includes(row.values.paymentMethod) ? row.values.paymentMethod : ""
            }
            onChange={(e) => onEdit({ paymentMethod: e.target.value })}
            className="input text-xs py-1"
            style={{ minWidth: "6rem" }}
          >
            <option value="" disabled>
              {row.values.paymentMethod}
            </option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        )}
      </td>

      <td className={CELL}>
        {row.values.paid && (
          <input
            aria-label={`${memberImportDialog.columnAmount} ${row.row}`}
            value={row.values.paidAmount}
            dir="ltr"
            inputMode="numeric"
            onChange={(e) => onEdit({ paidAmount: e.target.value.trim() })}
            className="input text-xs py-1"
            style={{ minWidth: "5rem" }}
          />
        )}
      </td>

      <td className={CELL}>
        <button
          type="button"
          aria-label={`${memberImportDialog.skipRow} ${row.row}`}
          aria-pressed={row.skip}
          onClick={onSkip}
          className="p-1.5 rounded-lg"
          style={{
            background: row.skip ? "var(--mint-600)" : "var(--mint-100)",
            color: row.skip ? "white" : "var(--mint-700)",
          }}
        >
          <Icon name={row.skip ? "check" : "ban"} />
        </button>
      </td>
    </tr>
  );
}
