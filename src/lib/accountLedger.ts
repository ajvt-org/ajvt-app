export const NO_ACCOUNT = "NONE";

export interface AccountSum {
  method: string | null;
  accountId: string | null;
  amount: number;
}

export interface AccountRef {
  id: string;
  code: string;
  label: string | null;
  closedAt: Date | null;
  method: string;
}

export interface AccountLine {
  id: string;
  code: string | null;
  label: string | null;
  closed: boolean;
  received: number;
  paid: number;
}

export interface MethodLedger {
  method: string;
  received: number;
  paid: number;
  accounts: AccountLine[];
}

interface Cell {
  method: string;
  accountId: string;
  received: number;
  paid: number;
}

function rank(method: string, order: readonly string[]): number {
  const at = order.indexOf(method);
  return at === -1 ? order.length : at;
}

function cellsOf(
  received: AccountSum[],
  paid: AccountSum[],
  known: Map<string, AccountRef>,
  unnamedMethod: string,
): Map<string, Cell> {
  const cells = new Map<string, Cell>();

  const add = (rows: AccountSum[], side: "received" | "paid") => {
    for (const row of rows) {
      const account = row.accountId ? known.get(row.accountId) : undefined;
      const method = account?.method ?? row.method?.trim() ?? "";
      const named = method || unnamedMethod;
      const accountId = row.accountId ?? NO_ACCOUNT;
      const key = `${named} ${accountId}`;
      const cell = cells.get(key) ?? { method: named, accountId, received: 0, paid: 0 };
      cell[side] += row.amount;
      cells.set(key, cell);
    }
  };

  add(received, "received");
  add(paid, "paid");
  return cells;
}

export function ledgerOf(
  received: AccountSum[],
  paid: AccountSum[],
  accounts: AccountRef[],
  methodOrder: readonly string[],
  unnamedMethod: string,
): MethodLedger[] {
  const known = new Map(accounts.map((account) => [account.id, account]));
  const byMethod = new Map<string, MethodLedger>();

  for (const cell of cellsOf(received, paid, known, unnamedMethod).values()) {
    const ledger = byMethod.get(cell.method) ?? {
      method: cell.method,
      received: 0,
      paid: 0,
      accounts: [],
    };
    const account = cell.accountId === NO_ACCOUNT ? undefined : known.get(cell.accountId);
    ledger.received += cell.received;
    ledger.paid += cell.paid;
    ledger.accounts.push({
      id: cell.accountId,
      code: account?.code ?? null,
      label: account?.label ?? null,
      closed: account?.closedAt != null,
      received: cell.received,
      paid: cell.paid,
    });
    byMethod.set(cell.method, ledger);
  }

  for (const ledger of byMethod.values()) {
    ledger.accounts.sort((a, b) => {
      if (a.id === NO_ACCOUNT) return 1;
      if (b.id === NO_ACCOUNT) return -1;
      return (a.code ?? "").localeCompare(b.code ?? "");
    });
  }

  return [...byMethod.values()].sort(
    (a, b) =>
      rank(a.method, methodOrder) - rank(b.method, methodOrder) ||
      b.received - a.received ||
      a.method.localeCompare(b.method),
  );
}
