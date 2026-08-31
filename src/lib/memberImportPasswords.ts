import { toCsv } from "./csv";
import { memberImportDialog } from "./texts";
import type { ImportedRow } from "./memberImportRun";

export function withPasswords(results: ImportedRow[]): ImportedRow[] {
  return results.filter((row) => row.tempPassword);
}

export function passwordsCsv(results: ImportedRow[]): string {
  return toCsv(
    [
      memberImportDialog.passwordsColumnName,
      memberImportDialog.passwordsColumnPhone,
      memberImportDialog.passwordsColumnPassword,
    ],
    withPasswords(results).map((row) => [row.fullName, row.phone, row.tempPassword ?? ""]),
  );
}
