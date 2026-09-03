"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { MEMBERSHIP_FEE, validatePaidAmount } from "@/lib/donations";
import { arabicValidity } from "@/lib/validationMessage";
import IconLabel from "@/components/IconLabel";
import { memberEdit } from "@/lib/texts/memberAdmin";

export default function YearAmountForm({
  memberId,
  year,
  amount,
  onSaved,
}: {
  memberId: string;
  year: number;
  amount: number | null;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(amount?.toString() ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const invalid = validatePaidAmount(value);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    try {
      await api.put(`/api/admin/members/${memberId}/payment`, {
        amountTransferred: Number(value),
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {amount === null ? `لم يُسجَّل مبلغ لسنة ${year}` : `تعديل مبلغ سنة ${year}`}
      </p>
      <div className="flex gap-2">
        <label htmlFor="year-amount" className="sr-only">
          المبلغ المسدد
        </label>
        <input
          id="year-amount"
          type="number"
          inputMode="numeric"
          min={MEMBERSHIP_FEE}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={String(MEMBERSHIP_FEE)}
          className="input input-sm flex-1"
          dir="ltr"
          {...arabicValidity(memberEdit.feeAtLeast(MEMBERSHIP_FEE))}
        />
        <button type="submit" disabled={saving} className="btn btn-primary btn-sm text-xs">
          <IconLabel name="save">{saving ? "جارٍ الحفظ" : "حفظ"}</IconLabel>
        </button>
      </div>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}
    </form>
  );
}
