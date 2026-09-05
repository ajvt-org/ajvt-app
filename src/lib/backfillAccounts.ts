export const MONEY_TABLES = ["Payment", "Membership", "Donation", "Expense"] as const;

export type MoneyTable = (typeof MONEY_TABLES)[number];

export interface AttachPlan {
  table: MoneyTable;
  accountId: string;
  ids: string[];
}

export interface AttachableRow {
  id: string;
  method: string | null;
  amount: number;
}

export interface AccountRow {
  id: string;
  code: string;
  closedAt: Date | null;
}

export interface MethodRow {
  name: string;
  accounts: AccountRow[];
}

export const NO_METHOD = "they name no method";
export const METHOD_HAS_NO_ACCOUNT = "their method does not have exactly one number";

export function soleAccountByMethod(methods: MethodRow[]): Map<string, AccountRow> {
  const sole = new Map<string, AccountRow>();
  for (const method of methods) {
    if (method.accounts.length === 1) sole.set(method.name, method.accounts[0]);
  }
  return sole;
}

export interface AttachableSplit {
  byAccount: Map<string, AttachableRow[]>;
  skipped: Map<string, number>;
  unmatched: Map<string, number>;
}

export function totalOf(rows: AttachableRow[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export function attachableRows(
  rows: AttachableRow[],
  sole: Map<string, AccountRow>,
): AttachableSplit {
  const byAccount = new Map<string, AttachableRow[]>();
  const skipped = new Map<string, number>();
  const unmatched = new Map<string, number>();

  const count = (into: Map<string, number>, key: string) => into.set(key, (into.get(key) ?? 0) + 1);

  for (const row of rows) {
    const name = row.method?.trim();
    if (!name) {
      count(skipped, NO_METHOD);
      continue;
    }
    const account = sole.get(name);
    if (!account) {
      count(skipped, METHOD_HAS_NO_ACCOUNT);
      count(unmatched, name);
      continue;
    }
    byAccount.set(account.id, [...(byAccount.get(account.id) ?? []), row]);
  }

  return { byAccount, skipped, unmatched };
}
