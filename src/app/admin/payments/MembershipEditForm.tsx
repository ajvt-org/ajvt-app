"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { usePaymentMethods } from "@/components/admin/usePaymentMethods";
import PaymentAccountPicker from "@/components/admin/PaymentAccountPicker";
import { accountsOfMethod, withHeldAccount } from "@/lib/paymentMethodChoices";
import {
  bankReference as bankReferenceTexts,
  membershipEdit,
  paymentAccountPicker,
} from "@/lib/texts";
import { validatePaidAmount } from "@/lib/donations";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import FormField from "@/components/admin/FormField";
import { DANGER, FIELD, PRIMARY, QUIET } from "./donationTones";
import type { Proof } from "./paymentTypes";

function dayOf(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function initial(proof: Proof) {
  return {
    amount: proof.amount != null ? String(proof.amount) : "",
    paidOn: dayOf(proof.paidOn),
    paymentMethod: proof.paymentMethod || "",
    accountId: proof.accountId || "",
    bankReference: proof.bankReference || "",
  };
}

export default function MembershipEditForm({
  proof,
  onCancel,
  onSaved,
}: {
  proof: Proof;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial(proof));
  const { methods } = usePaymentMethods(form.paymentMethod);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (changes: Partial<typeof form>) => setForm((p) => ({ ...p, ...changes }));
  const field = (name: string) => `membership-${name}-${proof.id}`;
  const accounts = accountsOfMethod(methods, form.paymentMethod);
  const offeredAccounts = withHeldAccount(accounts, proof.account ?? null);

  async function save() {
    if (!form.amount.trim()) {
      setError(membershipEdit.amountRequired);
      return;
    }
    const invalid = validatePaidAmount(form.amount);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError("");
    setSaving(true);
    try {
      await api.put(`/api/admin/members/${proof.id}/payment`, {
        amountTransferred: Number(form.amount),
        ...(form.paymentMethod ? { paymentMethod: form.paymentMethod } : {}),
        accountId: form.accountId || null,
        bankReference: form.bankReference.trim() || null,
        paidOn: form.paidOn || null,
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="p-2.5 rounded-lg space-y-2"
      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 items-start">
        <FormField id={field("amount")} label={membershipEdit.amount} compact>
          <input
            id={field("amount")}
            type="number"
            inputMode="numeric"
            dir="ltr"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
            className="input text-xs"
            style={FIELD}
          />
        </FormField>

        <FormField id={field("paid-on")} label={membershipEdit.paidOn} compact>
          <input
            id={field("paid-on")}
            type="date"
            dir="ltr"
            value={form.paidOn}
            onChange={(e) => set({ paidOn: e.target.value })}
            className="input text-xs"
            style={FIELD}
          />
        </FormField>

        <FormField id={field("method")} label={membershipEdit.paymentMethod} compact>
          <select
            id={field("method")}
            value={form.paymentMethod}
            onChange={(e) => set({ paymentMethod: e.target.value, accountId: "" })}
            className="input text-xs"
            style={FIELD}
          >
            <option value="">{membershipEdit.methodUnset}</option>
            {methods.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </FormField>

        {offeredAccounts.length > 0 && (
          <FormField id={field("account")} label={paymentAccountPicker.label} compact>
            <PaymentAccountPicker
              id={field("account")}
              accounts={accounts}
              value={form.accountId}
              held={proof.account ?? null}
              onPick={(accountId) => set({ accountId })}
              style={FIELD}
            />
          </FormField>
        )}

        <FormField id={field("bank-reference")} label={bankReferenceTexts.label} compact>
          <input
            id={field("bank-reference")}
            value={form.bankReference}
            onChange={(e) => set({ bankReference: e.target.value })}
            maxLength={40}
            dir="ltr"
            className="input text-xs"
            style={FIELD}
          />
          {proof.repeatedReference && (
            <p className="text-xs font-semibold" style={{ color: "var(--copper-500)" }}>
              {bankReferenceTexts.repeated}
            </p>
          )}
        </FormField>
      </div>

      {error && (
        <div className="p-2 rounded-lg text-xs font-semibold" style={DANGER}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={saving} className="btn btn-sm font-bold" style={PRIMARY}>
          {saving ? (
            membershipEdit.saving
          ) : (
            <IconLabel name="save">{membershipEdit.save}</IconLabel>
          )}
        </button>
        <button onClick={onCancel} className="btn btn-sm font-bold" style={QUIET}>
          {membershipEdit.cancel}
        </button>
      </div>
    </div>
  );
}
