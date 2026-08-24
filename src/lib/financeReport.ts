export interface ReportEntry {
  at: Date;
  amount: number;
  tags: string[];
}

export interface MonthRow {
  month: string;
  income: number;
  spending: number;
  net: number;
}

export interface TagRow {
  tag: string;
  amount: number;
}

export const UNTAGGED = "بلا وسم";

export function monthKey(at: Date): string {
  return at.toISOString().slice(0, 7);
}

export function monthsBetween(from: Date, to: Date): string[] {
  const months: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const last = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1);
  while (cursor.getTime() <= last) {
    months.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function byMonth(
  income: ReportEntry[],
  spending: ReportEntry[],
  from: Date,
  to: Date,
): MonthRow[] {
  const rows = new Map<string, MonthRow>();
  for (const month of monthsBetween(from, to)) {
    rows.set(month, { month, income: 0, spending: 0, net: 0 });
  }
  const add = (entries: ReportEntry[], field: "income" | "spending") => {
    for (const entry of entries) {
      const key = monthKey(entry.at);
      const row = rows.get(key) ?? { month: key, income: 0, spending: 0, net: 0 };
      row[field] += entry.amount;
      rows.set(key, row);
    }
  };
  add(income, "income");
  add(spending, "spending");

  return [...rows.values()]
    .map((row) => ({ ...row, net: row.income - row.spending }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function byTag(entries: ReportEntry[]): TagRow[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const tags = entry.tags.length > 0 ? entry.tags : [UNTAGGED];
    for (const tag of tags) totals.set(tag, (totals.get(tag) ?? 0) + entry.amount);
  }
  return [...totals.entries()]
    .map(([tag, amount]) => ({ tag, amount }))
    .sort((a, b) => b.amount - a.amount || a.tag.localeCompare(b.tag));
}

export function tagTotal(rows: TagRow[]): number {
  return rows.reduce((total, row) => total + row.amount, 0);
}

export function sumOf(entries: ReportEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}
