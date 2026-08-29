"use client";

import { amountInWords } from "@/lib/arabicAmount";
import { receiptAdmin } from "@/lib/texts/receipt";
import IconLabel from "@/components/IconLabel";
import type { ReceiptForm as Form } from "./types";

export default function ReceiptForm({
  form,
  onChange,
  onSubmit,
  saving,
  error,
  officersMissing,
}: {
  form: Form;
  onChange: (form: Form) => void;
  onSubmit: () => void;
  saving: boolean;
  error: string;
  officersMissing: boolean;
}) {
  const amount = Number(form.amount);
  const words = Number.isInteger(amount) && amount > 0 ? amountInWords(amount) : "";

  return (
    <form
      className="card p-5 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="block text-sm font-bold" htmlFor="receipt-payer">
        {receiptAdmin.payerLabel}
      </label>
      <input
        id="receipt-payer"
        className="input"
        required
        maxLength={80}
        placeholder={receiptAdmin.payerPlaceholder}
        value={form.payerName}
        onChange={(e) => onChange({ ...form, payerName: e.target.value })}
      />

      <label className="block text-sm font-bold" htmlFor="receipt-reason">
        {receiptAdmin.reasonLabel}
      </label>
      <input
        id="receipt-reason"
        className="input"
        required
        maxLength={120}
        placeholder={receiptAdmin.reasonPlaceholder}
        value={form.reason}
        onChange={(e) => onChange({ ...form, reason: e.target.value })}
      />

      <label className="block text-sm font-bold" htmlFor="receipt-amount">
        {receiptAdmin.amountLabel}
      </label>
      <input
        id="receipt-amount"
        className="input"
        type="number"
        min={1}
        step={1}
        required
        value={form.amount}
        onChange={(e) => onChange({ ...form, amount: e.target.value })}
      />
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {receiptAdmin.wordsLabel} : <span style={{ color: "var(--text-main)" }}>{words}</span>
      </p>

      <label className="block text-sm font-bold" htmlFor="receipt-date">
        {receiptAdmin.dateLabel}
      </label>
      <input
        id="receipt-date"
        className="input"
        type="date"
        required
        value={form.issuedOn}
        onChange={(e) => onChange({ ...form, issuedOn: e.target.value })}
      />

      {officersMissing && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {receiptAdmin.officersMissing}
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}

      <button type="submit" className="btn" disabled={saving}>
        {saving ? receiptAdmin.saving : <IconLabel name="download">{receiptAdmin.save}</IconLabel>}
      </button>
    </form>
  );
}
