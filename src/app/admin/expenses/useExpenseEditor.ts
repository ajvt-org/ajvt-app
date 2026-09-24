"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { matchDateToLocalInput } from "@/lib/clubTime";
import type { DestinationOption } from "@/lib/moneyDestination";
import { expensesPage } from "@/lib/texts";
import { expenseBodyOf } from "./expenseBody";
import { emptyExpenseForm, nowInputValue } from "./types";
import type { Expense, ExpenseForm } from "./types";

function formOf(expense: Expense): ExpenseForm {
  return {
    label: expense.label,
    amount: String(expense.amount),
    method: expense.method || "",
    accountId: expense.accountId || "",
    note: expense.note || "",
    date: matchDateToLocalInput(expense.date),
    proofs: expense.proofs.map((row) => row.filename),
    tagIds: expense.tags.map((t) => t.id),
    allocations: expense.allocations.length
      ? expense.allocations.map((share) => ({
          destinationId: share.activity?.id || share.competition?.id || "",
          amount: expense.allocations.length > 1 ? String(share.amount) : "",
        }))
      : [{ destinationId: "", amount: "" }],
  };
}

function problemWith(form: ExpenseForm): string {
  if (!form.label.trim()) return expensesPage.labelRequired;
  const amount = Number(form.amount);
  if (!Number.isInteger(amount) || amount <= 0) return expensesPage.amountInvalid;
  return "";
}

export function useExpenseEditor({
  destinations,
  reload,
}: {
  destinations: DestinationOption[];
  reload: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [held, setHeld] = useState<Expense["account"]>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function start(id: string | null, account: Expense["account"], next: ExpenseForm) {
    setEditingId(id);
    setHeld(account);
    setForm(next);
    setError("");
    setOpen(true);
  }

  async function submit(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    const problem = problemWith(form);
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      const body = expenseBodyOf(form, destinations);
      if (editingId) await api.patch(`/api/admin/expenses/${editingId}`, body);
      else await api.post("/api/admin/expenses", body);
      setOpen(false);
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return {
    open,
    editingId,
    held,
    form,
    error,
    saving,
    create: () => start(null, null, { ...emptyExpenseForm, date: nowInputValue() }),
    edit: (expense: Expense) => start(expense.id, expense.account, formOf(expense)),
    patch: (changes: Partial<ExpenseForm>) => setForm((p) => ({ ...p, ...changes })),
    submit,
    close: () => setOpen(false),
  };
}
