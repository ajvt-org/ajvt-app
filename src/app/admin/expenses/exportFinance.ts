import { toCsv, downloadCsv } from "@/lib/csv";
import type { Expense, FinanceSummary } from "./types";

const HEADERS = ["التاريخ", "النوع", "الاسم / الوصف", "التصنيف", "طريقة الدفع", "المبلغ"];

export function exportFinance(summary: FinanceSummary | null, expenses: Expense[]) {
  const revenue = (summary?.allRecords || []).map((r) => [
    r.date,
    "إيراد",
    r.name,
    r.kind,
    r.method,
    r.amount,
  ]);
  const spending = expenses.map((e) => [
    e.date.slice(0, 10),
    "مصروف",
    e.label,
    "مصروف",
    "-",
    e.amount,
  ]);

  const rows = [...revenue, ...spending].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  downloadCsv(`finance-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(HEADERS, rows));
}
