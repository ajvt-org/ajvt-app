"use client";

import IconLabel from "@/components/IconLabel";
import { counted } from "@/lib/arabicCount";
import { RESULT } from "@/lib/messages";
import { filterSheet as texts } from "@/lib/texts";

export interface FilterChip {
  key: string;
  label: string;
}

export default function FilterChipRow({
  chips,
  resultCount,
  onRemove,
  onClear,
}: {
  chips: FilterChip[];
  resultCount: number;
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 mb-3 flex-wrap">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => onRemove(chip.key)}
          className="text-xs px-2.5 py-1 rounded-lg font-bold"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          <IconLabel name="close">{chip.label}</IconLabel>
        </button>
      ))}

      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {counted(resultCount, RESULT)}
      </span>

      {chips.length > 1 && (
        <button
          onClick={onClear}
          className="text-xs font-bold"
          style={{ color: "var(--mint-700)" }}
        >
          <IconLabel name="close">{texts.clearCount(chips.length)}</IconLabel>
        </button>
      )}
    </div>
  );
}
