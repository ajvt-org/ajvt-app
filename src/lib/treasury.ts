import { splitPayment } from "./membershipPayment";

export interface TreasuryPayment {
  amount: number;
  purpose: string;
  feeApplied: number | null;
  method: string | null;
}

export interface MethodTotal {
  method: string;
  amount: number;
}

export interface TreasurySpending {
  amount: number;
  method: string | null;
}

export interface Treasury {
  balance: number;
  income: number;
  spending: number;
  fees: number;
  support: number;
  byMethod: MethodTotal[];
  spendingByMethod: MethodTotal[];
}

export const UNSPECIFIED_METHOD = "غير محدد";
export const OTHER_METHOD = "أخرى";

function totalsByMethod(
  entries: { amount: number; method: string | null }[],
  fallback: string,
  methodOrder: readonly string[],
): MethodTotal[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const method = entry.method?.trim() || fallback;
    totals.set(method, (totals.get(method) ?? 0) + entry.amount);
  }
  const rank = (method: string) => {
    const at = methodOrder.indexOf(method);
    return at === -1 ? methodOrder.length : at;
  };
  return [...totals.entries()]
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => rank(a.method) - rank(b.method) || b.amount - a.amount);
}

export function treasuryOf(
  payments: TreasuryPayment[],
  spending: TreasurySpending[],
  methodOrder: readonly string[] = [],
): Treasury {
  let income = 0;
  let fees = 0;
  let support = 0;

  for (const p of payments) {
    income += p.amount;
    if (p.purpose === "MEMBERSHIP") {
      const split = splitPayment(p.amount, p.feeApplied ?? 0);
      fees += split.fee;
      support += split.surplus;
    } else {
      support += p.amount;
    }
  }

  const spent = spending.reduce((sum, one) => sum + one.amount, 0);

  return {
    balance: income - spent,
    income,
    spending: spent,
    fees,
    support,
    byMethod: totalsByMethod(payments, UNSPECIFIED_METHOD, methodOrder),
    spendingByMethod: totalsByMethod(spending, OTHER_METHOD, methodOrder),
  };
}
