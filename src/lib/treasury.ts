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

export interface Treasury {
  balance: number;
  income: number;
  spending: number;
  fees: number;
  support: number;
  byMethod: MethodTotal[];
}

export const UNSPECIFIED_METHOD = "غير محدد";

export function treasuryOf(
  payments: TreasuryPayment[],
  spending: number,
  methodOrder: readonly string[] = [],
): Treasury {
  let income = 0;
  let fees = 0;
  let support = 0;
  const totals = new Map<string, number>();

  for (const p of payments) {
    income += p.amount;
    if (p.purpose === "MEMBERSHIP") {
      const split = splitPayment(p.amount, p.feeApplied ?? 0);
      fees += split.fee;
      support += split.surplus;
    } else {
      support += p.amount;
    }
    const method = p.method?.trim() || UNSPECIFIED_METHOD;
    totals.set(method, (totals.get(method) ?? 0) + p.amount);
  }

  const rank = (method: string) => {
    const at = methodOrder.indexOf(method);
    return at === -1 ? methodOrder.length : at;
  };

  const byMethod = [...totals.entries()]
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => rank(a.method) - rank(b.method) || b.amount - a.amount);

  return { balance: income - spending, income, spending, fees, support, byMethod };
}
