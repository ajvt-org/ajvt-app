import { describe, it, expect } from "vitest";
import { memberImportErrors } from "./messages";
import { MAX_IMPORT_ROWS, parseMemberCsv } from "./memberImportParse";

const HEADERS = "الاسم الكامل,الهاتف,القرية,العصر,طريقة الدفع,المبلغ المدفوع,دفع الاشتراك";

function rowsOf(text: string) {
  const result = parseMemberCsv(text);
  if (!result.ok) throw new Error(result.error);
  return result.rows;
}

describe("parseMemberCsv", () => {
  it("reads a plain comma separated file", () => {
    const rows = rowsOf(`${HEADERS}\nمحمد ولد أحمد,36000123,التاكلالت,البدريين,بنكيلي,100,نعم`);

    expect(rows).toEqual([
      {
        row: 1,
        cells: {
          fullName: "محمد ولد أحمد",
          phone: "36000123",
          village: "التاكلالت",
          age: "البدريين",
          paymentMethod: "بنكيلي",
          paidAmount: "100",
          paid: "نعم",
        },
      },
    ]);
  });

  it("reads a semicolon separated file", () => {
    const rows = rowsOf("الاسم الكامل;الهاتف\nمحمد ولد أحمد;36000123");

    expect(rows[0].cells.fullName).toBe("محمد ولد أحمد");
    expect(rows[0].cells.phone).toBe("36000123");
  });

  it("strips the byte order mark Excel writes", () => {
    const rows = rowsOf("﻿الاسم الكامل,الهاتف\nمحمد ولد أحمد,36000123");

    expect(rows[0].cells.fullName).toBe("محمد ولد أحمد");
  });

  it("keeps a comma inside a quoted field", () => {
    const rows = rowsOf('الاسم الكامل,القرية\n"أحمد, ولد محمد",التاكلالت');

    expect(rows[0].cells.fullName).toBe("أحمد, ولد محمد");
    expect(rows[0].cells.village).toBe("التاكلالت");
  });

  it("keeps a newline inside a quoted field and keeps the row numbering right", () => {
    const rows = rowsOf('الاسم الكامل,القرية\n"أحمد\nولد محمد",التاكلالت\nمحمد,أخرى');

    expect(rows).toHaveLength(2);
    expect(rows[0].cells.fullName).toBe("أحمد\nولد محمد");
    expect(rows[1].row).toBe(2);
  });

  it("keeps an escaped quote", () => {
    const rows = rowsOf('الاسم الكامل\n"أحمد ""الصغير"" ولد محمد"');

    expect(rows[0].cells.fullName).toBe('أحمد "الصغير" ولد محمد');
  });

  it("trims the cells and skips blank lines", () => {
    const rows = rowsOf("الاسم الكامل,الهاتف\n  محمد  ,  36000123  \n\n\nأحمد,36000124");

    expect(rows).toHaveLength(2);
    expect(rows[0].cells.fullName).toBe("محمد");
    expect(rows[0].cells.phone).toBe("36000123");
  });

  it("leaves a column absent from the file empty rather than failing", () => {
    const rows = rowsOf("الاسم الكامل\nمحمد ولد أحمد");

    expect(rows[0].cells.village).toBe("");
    expect(rows[0].cells.age).toBe("");
  });

  it("fills a short line rather than failing", () => {
    const rows = rowsOf("الاسم الكامل,الهاتف,القرية\nمحمد ولد أحمد");

    expect(rows[0].cells.phone).toBe("");
    expect(rows[0].cells.village).toBe("");
  });

  it("reports the columns it did not recognise", () => {
    const result = parseMemberCsv("الاسم الكامل,ملاحظات\nمحمد,شيء ما");

    expect(result.ok && result.unknownColumns).toEqual(["ملاحظات"]);
  });

  it("refuses an empty file", () => {
    expect(parseMemberCsv("")).toEqual({ ok: false, error: memberImportErrors.emptyFile });
    expect(parseMemberCsv("   \n\n")).toEqual({ ok: false, error: memberImportErrors.emptyFile });
  });

  it("refuses a file with headers and nothing else", () => {
    expect(parseMemberCsv(HEADERS)).toEqual({
      ok: false,
      error: memberImportErrors.headersOnly,
    });
  });

  it("refuses a file with no column it recognises", () => {
    expect(parseMemberCsv("%PDF-1.7 something binary\nmore bytes")).toEqual({
      ok: false,
      error: memberImportErrors.noColumns,
    });
  });

  it("refuses a file with no name column", () => {
    expect(parseMemberCsv("الهاتف,القرية\n36000123,التاكلالت")).toEqual({
      ok: false,
      error: memberImportErrors.missingName,
    });
  });

  it("refuses a file longer than the allowed number of rows", () => {
    const body = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `محمد ${i}`).join("\n");

    expect(parseMemberCsv(`الاسم الكامل\n${body}`)).toEqual({
      ok: false,
      error: memberImportErrors.tooManyRows(MAX_IMPORT_ROWS),
    });
  });

  it("accepts a file exactly at the allowed number of rows", () => {
    const body = Array.from({ length: MAX_IMPORT_ROWS }, (_, i) => `محمد ${i}`).join("\n");

    expect(rowsOf(`الاسم الكامل\n${body}`)).toHaveLength(MAX_IMPORT_ROWS);
  });
});
