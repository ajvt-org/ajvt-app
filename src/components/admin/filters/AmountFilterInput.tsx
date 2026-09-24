"use client";

import NumberInput from "@/components/NumberInput";
import { AMOUNT_OPS, type AmountFilter, type AmountOp } from "@/lib/amountFilter";
import { AMOUNT_OP_LABEL, amountFilter as texts } from "@/lib/texts";

export default function AmountFilterInput({
  value,
  onChange,
}: {
  value: AmountFilter;
  onChange: (next: AmountFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <select
        value={value.op}
        onChange={(e) => onChange({ ...value, op: e.target.value as AmountOp })}
        className="input input-sm shrink-0"
        style={{ width: "auto" }}
        aria-label={texts.operator}
      >
        {AMOUNT_OPS.map((op) => (
          <option key={op} value={op}>
            {AMOUNT_OP_LABEL[op]}
          </option>
        ))}
      </select>
      <NumberInput
        value={value.figure}
        min={0}
        step={1}
        placeholder={texts.figure}
        aria-label={texts.figure}
        onChange={(e) => onChange({ ...value, figure: e.target.value })}
        className="input input-sm min-w-0 flex-1"
      />
    </div>
  );
}
