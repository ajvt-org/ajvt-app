"use client";

import { useState } from "react";
import { validatePaidAmount } from "@/lib/donations";
import { bulkChange, bulkSurplus } from "@/lib/memberImportBulk";
import { memberImportDialog, ouguiya } from "@/lib/texts";
import type { RowValues } from "@/lib/memberImportValues";
import IconLabel from "@/components/IconLabel";

const texts = memberImportDialog.bulk;

const PICK = "text-xs font-bold px-2.5 py-1.5 rounded-lg";

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input text-xs py-1 w-full"
    >
      <option value="">{label}</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}

export default function MemberImportBulkFill({
  ageGroups,
  paymentMethods,
  membershipFee,
  selected,
  withMembership,
  onSelectAll,
  onSelectMissing,
  onClear,
  onApply,
}: {
  ageGroups: string[];
  paymentMethods: readonly string[];
  membershipFee: number;
  selected: number;
  withMembership: number;
  onSelectAll: () => void;
  onSelectMissing: () => void;
  onClear: () => void;
  onApply: (change: Partial<RowValues>) => void;
}) {
  const [age, setAge] = useState("");
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const change = bulkChange({ age, paymentMethod: method, paidAmount: amount });
  const surplus = bulkSurplus(amount, membershipFee);
  const ready = selected > 0 && Object.keys(change).length > 0;

  function apply() {
    const problem = method && amount.trim() ? validatePaidAmount(amount, membershipFee) : null;
    setError(problem ?? "");
    if (problem) return;
    onApply(change);
  }

  return (
    <div className="rounded-xl p-2.5 space-y-2" style={{ background: "var(--mint-100)" }}>
      <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
        <IconLabel name="list">{texts.title}</IconLabel>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className={PICK}
          style={{ background: "white", color: "var(--mint-700)" }}
        >
          {texts.selectAll}
        </button>
        <button
          type="button"
          onClick={onSelectMissing}
          className={PICK}
          style={{ background: "white", color: "var(--mint-700)" }}
        >
          {texts.selectMissingAgeGroup}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={selected === 0}
          className={PICK}
          style={{ background: "white", color: "var(--text-muted)" }}
        >
          {texts.clear}
        </button>
        <span className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
          {texts.selected(selected)}
        </span>
      </div>

      {withMembership > 0 && (
        <p className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
          {texts.withMembership(withMembership)}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <Choice label={texts.ageGroup} value={age} options={ageGroups} onChange={setAge} />
        <Choice label={texts.method} value={method} options={paymentMethods} onChange={setMethod} />
        <input
          aria-label={texts.amount}
          placeholder={texts.amount}
          value={amount}
          dir="ltr"
          inputMode="numeric"
          onChange={(e) => setAmount(e.target.value.trim())}
          className="input text-xs py-1 w-full"
        />
      </div>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        {memberImportDialog.amountHint}
      </p>

      {surplus > 0 && selected > 1 && (
        <p className="text-[11px] font-semibold" style={{ color: "#92400e" }}>
          <IconLabel name="warning">{texts.surplus(selected, ouguiya.amount(surplus))}</IconLabel>
        </p>
      )}

      {error && (
        <p className="text-[11px] font-semibold" style={{ color: "#991b1b" }}>
          <IconLabel name="warning">{error}</IconLabel>
        </p>
      )}

      <button
        type="button"
        onClick={apply}
        disabled={!ready}
        className="btn btn-primary text-xs w-full sm:w-auto"
      >
        {texts.apply}
      </button>
    </div>
  );
}
