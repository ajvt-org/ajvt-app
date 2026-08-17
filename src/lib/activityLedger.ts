export interface LedgerInput {
  id: string;
  kind: "income" | "expense";
  label: string;
  amount: number;
  date: string;
}

export interface LedgerEntry extends LedgerInput {
  balance: number;
}

export interface LedgerTotals {
  income: number;
  expenses: number;
  balance: number;
}

export function sortLedger(rows: LedgerInput[]): LedgerInput[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function withRunningBalance(rows: LedgerInput[]): LedgerEntry[] {
  let balance = 0;
  return sortLedger(rows).map((row) => {
    balance += row.kind === "income" ? row.amount : -row.amount;
    return { ...row, balance };
  });
}

export function ledgerTotals(rows: LedgerInput[]): LedgerTotals {
  const income = rows.filter((r) => r.kind === "income").reduce((sum, r) => sum + r.amount, 0);
  const expenses = rows.filter((r) => r.kind === "expense").reduce((sum, r) => sum + r.amount, 0);
  return { income, expenses, balance: income - expenses };
}
