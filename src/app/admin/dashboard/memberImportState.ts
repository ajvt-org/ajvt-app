import {
  checkValues,
  type CheckContext,
  type CheckedRow,
  type RowIssue,
} from "@/lib/memberImportCheck";
import { requiresAgeGroup } from "@/lib/villages";
import type { RowValues } from "@/lib/memberImportValues";

export interface EditableRow {
  row: number;
  values: RowValues;
  match: CheckedRow["match"];
  issues: RowIssue[];
  skip: boolean;
  selected: boolean;
}

export function editableRows(rows: CheckedRow[]): EditableRow[] {
  return rows.map((row) => ({
    row: row.row,
    values: row.values,
    match: row.match,
    issues: row.issues,
    skip: row.match?.kind === "phone",
    selected: false,
  }));
}

export function recheck(rows: EditableRow[], context: CheckContext): EditableRow[] {
  const kept = rows.filter((row) => !row.skip);
  const issues = checkValues(kept, context);
  const byRow = new Map(kept.map((row, at) => [row.row, issues[at]]));

  return rows.map((row) => ({ ...row, issues: row.skip ? [] : (byRow.get(row.row) ?? []) }));
}

export function editRow(
  rows: EditableRow[],
  at: number,
  change: Partial<RowValues>,
  context: CheckContext,
): EditableRow[] {
  const next = rows.map((row) => {
    if (row.row !== at) return row;
    const values = { ...row.values, ...change };
    if (change.village !== undefined && !requiresAgeGroup(values.village)) values.age = "";
    return { ...row, values };
  });
  return recheck(next, context);
}

function fillable(field: keyof RowValues, values: RowValues): boolean {
  if (field === "age") return requiresAgeGroup(values.village);
  return true;
}

function fillFor(values: RowValues, change: Partial<RowValues>): Partial<RowValues> {
  const fields = Object.entries(change).filter(([field]) =>
    fillable(field as keyof RowValues, values),
  );
  return Object.fromEntries(fields) as Partial<RowValues>;
}

export function fillValues(
  rows: EditableRow[],
  change: Partial<RowValues>,
  context: CheckContext,
): EditableRow[] {
  const next = rows.map((row) =>
    row.selected ? { ...row, values: { ...row.values, ...fillFor(row.values, change) } } : row,
  );
  return recheck(next, context);
}

export function toggleSkip(rows: EditableRow[], at: number, context: CheckContext): EditableRow[] {
  return recheck(
    rows.map((row) => (row.row === at ? { ...row, skip: !row.skip } : row)),
    context,
  );
}

export function selectRow(rows: EditableRow[], at: number, selected: boolean): EditableRow[] {
  return rows.map((row) => (row.row === at ? { ...row, selected } : row));
}

export function selectMissingAgeGroup(rows: EditableRow[]): EditableRow[] {
  return rows.map((row) => ({
    ...row,
    selected: !row.skip && requiresAgeGroup(row.values.village) && !row.values.age,
  }));
}

export function clearSelection(rows: EditableRow[]): EditableRow[] {
  return rows.map((row) => ({ ...row, selected: false }));
}

export function isRowBlocked(row: EditableRow): boolean {
  return row.issues.some((issue) => issue.blocking);
}

export interface RowTally {
  ready: number;
  blocked: number;
  skipped: number;
}

export function tally(rows: EditableRow[]): RowTally {
  return {
    ready: rows.filter((row) => !row.skip && !isRowBlocked(row)).length,
    blocked: rows.filter((row) => !row.skip && isRowBlocked(row)).length,
    skipped: rows.filter((row) => row.skip).length,
  };
}

export function canImport(rows: EditableRow[]): boolean {
  const counted = tally(rows);
  return counted.blocked === 0 && counted.ready > 0;
}
