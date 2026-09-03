import { byTag, sumOf, type ReportEntry, type TagRow } from "./financeReport";
import { destinationKind, type DestinationKind, type MoneyDestination } from "./moneyDestination";

export interface ReportActivity {
  id: string;
  title: string;
}

export interface ReportCompetition {
  id: string;
  name: string;
}

export interface ReportPayment extends ReportEntry, MoneyDestination {
  receiptNumber: string | null;
}

export type ReportExpense = ReportEntry & MoneyDestination;

export interface ActivityReportRow {
  key: string;
  kind: DestinationKind;
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

const GENERAL_KEY = "general";

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
  key: string,
  kind: DestinationKind,
  title: string,
  payments: ReportPayment[],
  expenses: ReportExpense[],
): ActivityReportRow {
  const income = sumOf(payments);
  const spending = sumOf(expenses);
  return {
    key,
    kind,
    title,
    income,
    spending,
    balance: income - spending,
    incomeByTag: byTag(payments),
    spendingByTag: byTag(expenses),
    receiptNumbers: receiptsOf(payments),
  };
}

const aimedAt = <T extends MoneyDestination>(rows: T[], kind: DestinationKind, id: string) =>
  rows.filter(
    (row) =>
      destinationKind(row) === kind &&
      (kind === "activity" ? row.activityId : row.competitionId) === id,
  );

export function activityReportRows(
  activities: ReportActivity[],
  competitions: ReportCompetition[],
  payments: ReportPayment[],
  expenses: ReportExpense[],
  generalTitle: string,
): ActivityReportRow[] {
  const attached = [
    ...activities.map((activity) =>
      rowFor(
        activity.id,
        "activity",
        activity.title,
        aimedAt(payments, "activity", activity.id),
        aimedAt(expenses, "activity", activity.id),
      ),
    ),
    ...competitions.map((competition) =>
      rowFor(
        competition.id,
        "competition",
        competition.name,
        aimedAt(payments, "competition", competition.id),
        aimedAt(expenses, "competition", competition.id),
      ),
    ),
  ]
    .filter((row) => movement(row) > 0)
    .sort((a, b) => movement(b) - movement(a) || a.title.localeCompare(b.title));

  const general = rowFor(
    GENERAL_KEY,
    "general",
    generalTitle,
    payments.filter((p) => destinationKind(p) === "general"),
    expenses.filter((e) => destinationKind(e) === "general"),
  );

  return movement(general) > 0 ? [...attached, general] : attached;
}

export function activityReportTotals(rows: ActivityReportRow[]): ActivityReportTotals {
  const income = rows.reduce((total, row) => total + row.income, 0);
  const spending = rows.reduce((total, row) => total + row.spending, 0);
  return { income, spending, balance: income - spending };
}
