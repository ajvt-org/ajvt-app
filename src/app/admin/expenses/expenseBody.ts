import { destinationOf, type DestinationOption } from "@/lib/moneyDestination";
import type { ExpenseForm } from "./types";

export function expenseBodyOf(form: ExpenseForm, destinations: DestinationOption[]) {
  return {
    label: form.label.trim(),
    amount: Number(form.amount),
    method: form.method || null,
    accountId: form.accountId || null,
    note: form.note.trim() || null,
    date: form.date || undefined,
    proofs: form.proofs,
    tagIds: form.tagIds,
    ...(form.allocations.length > 1
      ? {
          allocations: form.allocations.map((share) => ({
            ...destinationOf(destinations, share.destinationId),
            amount: Number(share.amount),
          })),
        }
      : destinationOf(destinations, form.allocations[0]?.destinationId ?? "")),
  };
}
