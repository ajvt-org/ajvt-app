import { toCsv } from "./csv";
import { headerFor } from "./memberImportColumns";
import { IMPORT_COLUMNS } from "./memberImportRow";
import { memberImport } from "./texts";
import { HOME_VILLAGE } from "./villages";

export const TEMPLATE_FILE_NAME = "members-template.csv";

export function templateCsv(ageGroup: string, exampleMethod: string): string {
  const headers = IMPORT_COLUMNS.map(headerFor);
  const example = [
    memberImport.exampleName,
    "36000123",
    HOME_VILLAGE,
    ageGroup,
    exampleMethod,
    "",
    memberImport.paidYes[0],
  ];
  return toCsv(headers, [example]);
}
