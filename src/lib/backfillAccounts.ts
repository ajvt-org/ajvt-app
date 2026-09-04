export interface AttachableRow {
  id: string;
  method: string | null;
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
export const METHOD_HAS_NO_ACCOUNT = "their method has no open number";

export function soleAccountByMethod(methods: MethodRow[]): Map<string, AccountRow> {
  const sole = new Map<string, AccountRow>();
  for (const method of methods) {
    const open = method.accounts.filter((account) => account.closedAt === null);
    if (open.length === 1) sole.set(method.name, open[0]);
  }
  return sole;
}

export function attachableRows(
  rows: AttachableRow[],
  sole: Map<string, AccountRow>,
): { byAccount: Map<string, string[]>; skipped: Map<string, number> } {
  const byAccount = new Map<string, string[]>();
  const skipped = new Map<string, number>();

  const skip = (reason: string) => skipped.set(reason, (skipped.get(reason) ?? 0) + 1);

  for (const row of rows) {
    const name = row.method?.trim();
    if (!name) {
      skip(NO_METHOD);
      continue;
    }
    const account = sole.get(name);
    if (!account) {
      skip(METHOD_HAS_NO_ACCOUNT);
      continue;
    }
    byAccount.set(account.id, [...(byAccount.get(account.id) ?? []), row.id]);
  }

  return { byAccount, skipped };
}
