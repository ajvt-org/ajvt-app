import { byTag, sumOf, type ReportEntry, type TagRow } from "./financeReport";

export interface ReportActivity {
  id: string;
  title: string;
}

export interface ReportPayment extends ReportEntry {
  activityId: string | null;
  receiptNumber: string | null;
}

export interface ReportExpense extends ReportEntry {
  activityId: string | null;
}

export interface ActivityReportRow {
  activityId: string | null;
  title: string;
  income: number;
  spending: number;
  balance: number;
  incomeByTag: TagRow[];
  spendingByTag: TagRow[];
  receiptNumbers: string[];
}

export interface ActivityReportTotals {
  income: number;
  spending: number;
  balance: number;
}

function movement(row: ActivityReportRow): number {
  return row.income + row.spending;
}

function receiptsOf(payments: ReportPayment[]): string[] {
  const numbers = new Set<string>();
  for (const payment of payments) {
    if (payment.receiptNumber) numbers.add(payment.receiptNumber);
  }
  return [...numbers].sort((a, b) => a.localeCompare(b));
}

function rowFor(
  activityId: string | null,
  title: string,
  payments: ReportPayment[],
  expenses: ReportExpense[],
): ActivityReportRow {
  const income = sumOf(payments);
  const spending = sumOf(expenses);
  return {
    activityId,
    title,
    income,
    spending,
    balance: income - spending,
    incomeByTag: byTag(payments),
    spendingByTag: byTag(expenses),
    receiptNumbers: receiptsOf(payments),
  };
}

export function activityReportRows(
  activities: ReportActivity[],
  payments: ReportPayment[],
  expenses: ReportExpense[],
  generalTitle: string,
): ActivityReportRow[] {
  const attached = activities
    .map((activity) =>
      rowFor(
        activity.id,
        activity.title,
        payments.filter((p) => p.activityId === activity.id),
        expenses.filter((e) => e.activityId === activity.id),
      ),
    )
    .filter((row) => movement(row) > 0)
    .sort((a, b) => movement(b) - movement(a) || a.title.localeCompare(b.title));

  const general = rowFor(
    null,
    generalTitle,
    payments.filter((p) => p.activityId === null),
    expenses.filter((e) => e.activityId === null),
  );

  return movement(general) > 0 ? [...attached, general] : attached;
}

export function activityReportTotals(rows: ActivityReportRow[]): ActivityReportTotals {
  const income = rows.reduce((total, row) => total + row.income, 0);
  const spending = rows.reduce((total, row) => total + row.spending, 0);
  return { income, spending, balance: income - spending };
}
