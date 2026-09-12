"use client";

import FilterChipRow, { type FilterChip } from "@/components/admin/filters/FilterChipRow";
import { filterSheet } from "@/lib/texts";
import { ADMIN_ORIGIN, SELF_ORIGIN, NO_FILTERS, type MemberFilters } from "@/lib/memberFilters";
import type { RecordingAdmin } from "./types";

const PAID_LABEL: Record<string, string> = {
  full: filterSheet.paidFull,
  partial: filterSheet.paidPartial,
  none: filterSheet.paidNone,
};

const ORIGIN_LABEL: Record<string, string> = {
  [ADMIN_ORIGIN]: filterSheet.originAdmin,
  [SELF_ORIGIN]: filterSheet.originSelf,
};

export function standingLabel(standing: string, year: number): string | null {
  if (standing === "current") return filterSheet.standingCurrent(year);
  if (standing === "former") return filterSheet.standingFormer(year);
  return null;
}

function chipsFor(
  filters: MemberFilters,
  year: number,
  recordingAdmins: RecordingAdmin[],
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.age) chips.push({ key: "age", label: filters.age });
  if (filters.method) chips.push({ key: "method", label: filters.method });
  if (filters.paid && PAID_LABEL[filters.paid])
    chips.push({ key: "paid", label: PAID_LABEL[filters.paid] });
  if (filters.year)
    chips.push({ key: "year", label: filterSheet.yearOption(Number(filters.year)) });
  if (filters.from) chips.push({ key: "from", label: `${filterSheet.from} ${filters.from}` });
  if (filters.to) chips.push({ key: "to", label: `${filterSheet.to} ${filters.to}` });
  const standing = standingLabel(filters.standing, year);
  if (standing) chips.push({ key: "standing", label: standing });
  const origin = ORIGIN_LABEL[filters.origin];
  if (origin) chips.push({ key: "origin", label: origin });
  const recorder = recordingAdmins.find((admin) => admin.id === filters.recorder);
  if (recorder) chips.push({ key: "recorder", label: recorder.username });
  if (filters.nophone) chips.push({ key: "nophone", label: filterSheet.noPhone });
  if (filters.nocapture) chips.push({ key: "nocapture", label: filterSheet.noCapture });
  return chips;
}

export default function FilterChips({
  filters,
  year,
  recordingAdmins,
  resultCount,
  onChange,
}: {
  filters: MemberFilters;
  year: number;
  recordingAdmins: RecordingAdmin[];
  resultCount: number;
  onChange: (next: MemberFilters) => void;
}) {
  return (
    <FilterChipRow
      chips={chipsFor(filters, year, recordingAdmins)}
      resultCount={resultCount}
      onRemove={(key) =>
        onChange(
          key === "origin"
            ? { ...filters, origin: "", recorder: "", nophone: "", nocapture: "" }
            : { ...filters, [key]: "" },
        )
      }
      onClear={() => onChange({ ...NO_FILTERS, status: filters.status, q: filters.q })}
    />
  );
}
