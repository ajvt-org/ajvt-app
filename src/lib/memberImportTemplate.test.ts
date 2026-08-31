import { describe, it, expect } from "vitest";
import { parseMemberCsv } from "./memberImportParse";
import { templateCsv } from "./memberImportTemplate";
import { IMPORT_COLUMNS } from "./memberImportRow";

describe("templateCsv", () => {
  it("reads back through the parser with every column recognised", () => {
    const result = parseMemberCsv(templateCsv("البدريين"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.unknownColumns).toEqual([]);
    expect(result.rows).toHaveLength(1);
  });

  it("carries a filled example on every column", () => {
    const result = parseMemberCsv(templateCsv("البدريين"));

    if (!result.ok) throw new Error(result.error);
    const filled = IMPORT_COLUMNS.filter((column) => result.rows[0].cells[column]);
    expect(filled).toEqual(IMPORT_COLUMNS.filter((column) => column !== "paidAmount"));
  });

  it("uses the age group it is given", () => {
    const result = parseMemberCsv(templateCsv("الإتحاد"));

    if (!result.ok) throw new Error(result.error);
    expect(result.rows[0].cells.age).toBe("الإتحاد");
  });
});
