"use client";

import IconLabel from "@/components/IconLabel";
import { expensesPage } from "@/lib/texts";

export default function ExpensesHeader({
  count,
  onExport,
  onToggleTags,
  onAdd,
}: {
  count: number;
  onExport: () => void;
  onToggleTags: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="banknote">{expensesPage.ledger(count)}</IconLabel>
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onExport}
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-100)",
          }}
        >
          <IconLabel name="download">{expensesPage.exportAction}</IconLabel>
        </button>
        <button
          onClick={onToggleTags}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="tag">{expensesPage.tags}</IconLabel>
        </button>
        <button
          onClick={onAdd}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          <IconLabel name="plus">{expensesPage.addExpense}</IconLabel>
        </button>
      </div>
    </div>
  );
}
