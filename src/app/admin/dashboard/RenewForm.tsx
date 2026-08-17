"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { PAYMENT_METHODS } from "@/lib/donations";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";

const EMPTY = { paidAmount: "", paymentMethod: "", paymentProof: "" };

export default function RenewForm({
  memberId,
  year,
  onRenewed,
}: {
  memberId: string;
  year: number;
  onRenewed: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (changes: Partial<typeof EMPTY>) => setForm((p) => ({ ...p, ...changes }));

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post(`/api/admin/members/${memberId}/renew`, {
        paidAmount: Number(form.paidAmount),
        paymentMethod: form.paymentMethod,
        paymentProof: form.paymentProof || null,
      });
      setForm(EMPTY);
      onRenewed();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 mt-2">
      <input
        type="number"
        dir="ltr"
        min={1}
        placeholder="المبلغ المسدد"
        value={form.paidAmount}
        onChange={(e) => set({ paidAmount: e.target.value })}
        required
        className="input text-xs"
        style={{ background: "white" }}
      />
      <select
        value={form.paymentMethod}
        onChange={(e) => set({ paymentMethod: e.target.value })}
        required
        className="input text-xs"
        style={{ background: "white" }}
      >
        <option value="" disabled>
          طريقة الدفع
        </option>
        {PAYMENT_METHODS.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>
      <PhotoUpload
        photo={form.paymentProof || null}
        variant="cover"
        label="إثبات الدفع (اختياري)"
        placeholderIcon="receipt"
        onUpload={(filename) => set({ paymentProof: filename })}
      />

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="text-xs px-3 py-1.5 rounded-lg font-bold"
        style={{ background: "var(--mint-600)", color: "white" }}
      >
        {saving ? "..." : <IconLabel name="refresh">تجديد عضوية {year}</IconLabel>}
      </button>
    </form>
  );
}
