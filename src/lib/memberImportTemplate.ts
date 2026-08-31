import { toCsv } from "./csv";
import { headerFor } from "./memberImportColumns";
import { IMPORT_COLUMNS } from "./memberImportRow";
import { memberImport } from "./texts";
import { HOME_VILLAGE } from "./villages";
import { PAYMENT_METHODS } from "./donations";

export const TEMPLATE_FILE_NAME = "members-template.csv";

export function templateCsv(ageGroup: string): string {
  const headers = IMPORT_COLUMNS.map(headerFor);
  const example = [
    memberImport.exampleName,
    "36000123",
    HOME_VILLAGE,
    ageGroup,
    PAYMENT_METHODS[PAYMENT_METHODS.length - 1],
    "",
    memberImport.paidYes[0],
  ];
  return toCsv(headers, [example]);
}
