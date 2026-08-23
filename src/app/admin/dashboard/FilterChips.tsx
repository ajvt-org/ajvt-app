"use client";

import IconLabel from "@/components/IconLabel";
import { counted } from "@/lib/arabicCount";
import { RESULT } from "@/lib/messages";
import { NO_FILTERS, type MemberFilters } from "@/lib/memberFilters";

const PAID_LABEL: Record<string, string> = {
  full: "دفع كامل",
  partial: "دفع ناقص",
  none: "لم يدفع",
};

export function standingLabel(standing: string, year: number): string | null {
  if (standing === "current") return `حالي ${year}`;
  if (standing === "former") return `سابق ${year}`;
  return null;
}

type Chip = { key: keyof MemberFilters; label: string };

function chipsFor(filters: MemberFilters, year: number): Chip[] {
  const chips: Chip[] = [];
  if (filters.age) chips.push({ key: "age", label: filters.age });
  if (filters.method) chips.push({ key: "method", label: filters.method });
  if (filters.paid && PAID_LABEL[filters.paid])
    chips.push({ key: "paid", label: PAID_LABEL[filters.paid] });
  if (filters.year) chips.push({ key: "year", label: `عضوية ${filters.year}` });
  if (filters.from) chips.push({ key: "from", label: `من ${filters.from}` });
  if (filters.to) chips.push({ key: "to", label: `إلى ${filters.to}` });
  const standing = standingLabel(filters.standing, year);
  if (standing) chips.push({ key: "standing", label: standing });
  return chips;
}

export default function FilterChips({
  filters,
  year,
  resultCount,
  onChange,
}: {
  filters: MemberFilters;
  year: number;
  resultCount: number;
  onChange: (next: MemberFilters) => void;
}) {
  const chips = chipsFor(filters, year);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 mb-3 flex-wrap">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => onChange({ ...filters, [chip.key]: "" })}
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
          onClick={() => onChange({ ...NO_FILTERS, status: filters.status, q: filters.q })}
          className="text-xs font-bold"
          style={{ color: "var(--mint-700)" }}
        >
          <IconLabel name="close">إزالة التصفية ({chips.length})</IconLabel>
        </button>
      )}
    </div>
  );
}
