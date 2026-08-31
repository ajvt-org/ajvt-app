import Papa from "papaparse";
import { memberImportErrors } from "./messages";
import { mapHeaders } from "./memberImportColumns";
import { emptyCells, type ImportRow } from "./memberImportRow";

export const MAX_IMPORT_ROWS = 500;

const DELIMITERS = [",", ";", "\t", "|"];

export type ParseResult =
  { ok: false; error: string } | { ok: true; rows: ImportRow[]; unknownColumns: string[] };

function isBlank(cells: string[]): boolean {
  return cells.every((cell) => !cell.trim());
}

export function parseMemberCsv(text: string): ParseResult {
  const content = text.replace(/^\uFEFF/, "");
  if (!content.trim()) return { ok: false, error: memberImportErrors.emptyFile };

  const parsed = Papa.parse<string[]>(content, {
    delimitersToGuess: DELIMITERS,
    skipEmptyLines: "greedy",
  });

  const table = parsed.data.filter((line) => Array.isArray(line) && !isBlank(line));
  if (table.length === 0) return { ok: false, error: memberImportErrors.emptyFile };

  const { columns, found, unknown } = mapHeaders(table[0]);
  if (found.length === 0) return { ok: false, error: memberImportErrors.noColumns };
  if (!found.includes("fullName")) return { ok: false, error: memberImportErrors.missingName };

  const body = table.slice(1);
  if (body.length === 0) return { ok: false, error: memberImportErrors.headersOnly };
  if (body.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: memberImportErrors.tooManyRows(MAX_IMPORT_ROWS) };
  }

  const rows = body.map((line, index) => {
    const cells = emptyCells();
    columns.forEach((column, at) => {
      if (column) cells[column] = (line[at] ?? "").trim();
    });
    return { row: index + 1, cells };
  });

  return { ok: true, rows, unknownColumns: unknown };
}
