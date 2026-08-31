"use client";

import { useState } from "react";
import { memberImportDialog } from "@/lib/texts";
import IconLabel from "@/components/IconLabel";

export default function MemberImportBulkFill({
  ageGroups,
  selected,
  onSelectMissing,
  onClear,
  onApply,
}: {
  ageGroups: string[];
  selected: number;
  onSelectMissing: () => void;
  onClear: () => void;
  onApply: (age: string) => void;
}) {
  const [age, setAge] = useState("");

  return (
    <div className="rounded-xl p-2.5 space-y-2" style={{ background: "var(--mint-100)" }}>
      <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
        <IconLabel name="list">{memberImportDialog.bulkTitle}</IconLabel>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSelectMissing}
          className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
          style={{ background: "white", color: "var(--mint-700)" }}
        >
          {memberImportDialog.bulkSelectAllBlocked}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={selected === 0}
          className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
          style={{ background: "white", color: "var(--text-muted)" }}
        >
          {memberImportDialog.bulkClear}
        </button>
        <span className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
          {memberImportDialog.bulkSelected(selected)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          aria-label={memberImportDialog.bulkAgeGroup}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="input text-xs py-1"
        >
          <option value="" disabled>
            {memberImportDialog.bulkAgeGroup}
          </option>
          {ageGroups.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onApply(age)}
          disabled={!age || selected === 0}
          className="btn btn-primary text-xs shrink-0"
        >
          {memberImportDialog.bulkApply}
        </button>
      </div>
    </div>
  );
}
