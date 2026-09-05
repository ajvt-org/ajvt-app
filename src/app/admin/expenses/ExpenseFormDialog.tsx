"use client";

import DialogClose from "@/components/DialogClose";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import FinanceTagChips from "@/components/admin/FinanceTagChips";
import ExpenseProofsField from "./ExpenseProofsField";
import ExpenseDestinationsField from "./ExpenseDestinationsField";
import type { FinanceTagRow } from "@/components/admin/FinanceTagManager";
import { usePaymentMethods } from "@/components/admin/usePaymentMethods";
import PaymentAccountPicker from "@/components/admin/PaymentAccountPicker";
import { accountsOfMethod } from "@/lib/paymentMethodChoices";
import { paymentAccountPicker } from "@/lib/texts";
import { expenseForm as texts } from "@/lib/texts";
import type { DestinationOption } from "@/lib/moneyDestination";
import type { ExpenseForm } from "./types";

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-sm font-bold mb-1.5"
        style={{ color: "var(--text-main)" }}
        htmlFor={id}
      >
        {label} {required && <span style={{ color: "var(--copper-500)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default function ExpenseFormDialog({
  form,
  tags,
  destinations,
  editing,
  expenseId,
  held,
  error,
  saving,
  onChange,
  onSubmit,
  onClose,
}: {
  form: ExpenseForm;
  tags: FinanceTagRow[];
  destinations: DestinationOption[];
  editing: boolean;
  expenseId: string | null;
  held?: { id: string; code: string; label: string | null } | null;
  error: string;
  saving: boolean;
  onChange: (patch: Partial<ExpenseForm>) => void;
  onSubmit: (ev: React.SubmitEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const { methods } = usePaymentMethods(form.method);
  const accounts = accountsOfMethod(methods, form.method);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between sticky top-0"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          <h2 className="font-black text-white text-base">
            {editing ? (
              <IconLabel name="pencil">{texts.editTitle}</IconLabel>
            ) : (
              <IconLabel name="plus">{texts.addTitle}</IconLabel>
            )}
          </h2>
          <DialogClose onClick={onClose} />
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-3">
          <ExpenseProofsField
            proofs={form.proofs}
            expenseId={expenseId}
            onChange={(proofs) => onChange({ proofs })}
          />

          <Field id="expense-label" label={texts.label} required>
            <input
              id="expense-label"
              type="text"
              value={form.label}
              onChange={(e) => onChange({ label: e.target.value })}
              maxLength={100}
              required
              className="input"
            />
          </Field>

          <Field id="expense-amount" label={texts.amount} required>
            <input
              id="expense-amount"
              type="number"
              dir="ltr"
              min={1}
              value={form.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              required
              className="input"
            />
          </Field>

          <Field id="expense-method" label={texts.method}>
            <select
              id="expense-method"
              value={form.method}
              onChange={(e) => onChange({ method: e.target.value, accountId: "" })}
              className="input"
            >
              <option value="">{texts.noMethod}</option>
              {methods.map((method) => (
                <option key={method.name} value={method.name}>
                  {method.name}
                </option>
              ))}
            </select>
          </Field>

          {accounts.length > 0 && (
            <Field id="expense-account" label={paymentAccountPicker.expenseLabel}>
              <PaymentAccountPicker
                id="expense-account"
                accounts={accounts}
                value={form.accountId}
                held={held}
                label={paymentAccountPicker.expenseLabel}
                onPick={(accountId) => onChange({ accountId })}
              />
            </Field>
          )}

          <Field id="expense-date" label={texts.date}>
            <input
              id="expense-date"
              type="date"
              dir="ltr"
              value={form.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className="input"
            />
          </Field>

          <Field id="expense-note" label={texts.note}>
            <input
              id="expense-note"
              type="text"
              value={form.note}
              onChange={(e) => onChange({ note: e.target.value })}
              maxLength={200}
              className="input"
            />
          </Field>

          <ExpenseDestinationsField
            shares={form.allocations}
            destinations={destinations}
            total={Number(form.amount) || 0}
            onChange={(allocations) => onChange({ allocations })}
          />

          <div>
            <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              {texts.tags}
            </p>
            <FinanceTagChips
              tags={tags}
              selected={form.tagIds}
              onToggle={(id) =>
                onChange({
                  tagIds: form.tagIds.includes(id)
                    ? form.tagIds.filter((t) => t !== id)
                    : [...form.tagIds, id],
                })
              }
              empty={texts.noTags}
            />
          </div>

          {error && (
            <div
              className="p-3 rounded-xl text-sm font-semibold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <Icon name="warning" size={13} className="icon-inline" /> {error}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn btn-primary text-sm">
            {saving ? "..." : editing ? <IconLabel name="save">{texts.save}</IconLabel> : texts.add}
          </button>
        </form>
      </div>
    </div>
  );
}
