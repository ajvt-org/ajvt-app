export interface Expense {
  id: string;
  label: string;
  amount: number;
  note: string | null;
  proof: string | null;
  date: string;
  createdBy: string;
  tags: { id: string; name: string }[];
}

export interface NamedEntry {
  name: string;
  amount: number;
}

export interface MethodDetail {
  intisab: NamedEntry[];
  daem: NamedEntry[];
  anonymousTotal: number;
}

export interface UnassignedDonation {
  id: string;
  name: string;
  amount: number;
}

export interface DayRecord {
  date: string;
  time: string;
  name: string;
  amount: number;
  method: string;
  kind: "انتساب" | "دعم";
}

export interface FinanceDay {
  date: string;
  total: number;
  byMethod: Record<string, number>;
  records: DayRecord[];
}

export interface FinanceSummary {
  byMethod: Record<string, number>;
  byMethodDetail: Record<string, MethodDetail>;
  unassigned: UnassignedDonation[];
  days: FinanceDay[];
  allRecords: DayRecord[];
  totalRevenue: number;
  totalExpenses: number;
  net: number;
}

export interface ExpenseForm {
  label: string;
  amount: string;
  note: string;
  date: string;
  proof: string;
  tagIds: string[];
}

export const emptyExpenseForm: ExpenseForm = {
  label: "",
  amount: "",
  note: "",
  date: "",
  proof: "",
  tagIds: [],
};

export const PAGE_SIZE = 30;

export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function groupDayRecords(records: DayRecord[]) {
  const groups: Record<string, Record<string, DayRecord[]>> = { دعم: {}, انتساب: {} };
  for (const record of records) {
    groups[record.kind][record.method] = groups[record.kind][record.method] || [];
    groups[record.kind][record.method].push(record);
  }
  return groups;
}
