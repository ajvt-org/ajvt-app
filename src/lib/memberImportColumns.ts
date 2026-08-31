import { memberImport } from "./texts";
import { IMPORT_COLUMNS, type ImportColumn } from "./memberImportRow";

const ARABIC_MARKS = /[\u064B-\u0652\u0640]/g;

export function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .replace(ARABIC_MARKS, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function headerFor(column: ImportColumn): string {
  return memberImport.columns[column][0];
}

const BY_HEADER = new Map<string, ImportColumn>(
  IMPORT_COLUMNS.flatMap((column) =>
    memberImport.columns[column].map((alias) => [normalizeHeader(alias), column] as const),
  ),
);

export function columnFor(header: string): ImportColumn | null {
  return BY_HEADER.get(normalizeHeader(header)) ?? null;
}

export interface HeaderMap {
  columns: (ImportColumn | null)[];
  found: ImportColumn[];
  unknown: string[];
}

export function mapHeaders(headers: string[]): HeaderMap {
  const columns: (ImportColumn | null)[] = [];
  const found: ImportColumn[] = [];
  const unknown: string[] = [];

  for (const header of headers) {
    const column = columnFor(header);
    if (column && !found.includes(column)) {
      columns.push(column);
      found.push(column);
      continue;
    }
    columns.push(null);
    if (header.trim()) unknown.push(header.trim());
  }

  return { columns, found, unknown };
}
