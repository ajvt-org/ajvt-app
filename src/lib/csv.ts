// Excel on Windows only reads UTF-8 CSV correctly when it starts with a BOM,
// and these files are full of Arabic names.
const BOM = "﻿";

const FORMULA = /^[=+\-@\t\r]/;

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (cell: string | number | null | undefined) => {
    const text = String(cell ?? "");
    const safe = typeof cell !== "number" && FORMULA.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return BOM + [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
