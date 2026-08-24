import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

const BOM = "﻿";

describe("toCsv", () => {
  it("starts with a BOM so Excel reads the arabic correctly", () => {
    expect(toCsv(["الاسم"], [["محمد"]]).startsWith(BOM)).toBe(true);
  });

  it("quotes every cell", () => {
    expect(toCsv(["a", "b"], [["1", "2"]])).toBe(`${BOM}"a","b"\n"1","2"`);
  });

  it("escapes quotes by doubling them", () => {
    expect(toCsv(["h"], [['he said "hi"']])).toContain('"he said ""hi"""');
  });

  it("keeps a comma inside a cell from splitting the column", () => {
    const csv = toCsv(["h"], [["Nouakchott, Mauritania"]]);
    expect(csv).toContain('"Nouakchott, Mauritania"');
    expect(csv.split("\n")[1]).toBe('"Nouakchott, Mauritania"');
  });

  it("writes null and undefined as empty, not as the words", () => {
    const csv = toCsv(["a", "b"], [[null, undefined]]);
    expect(csv).toContain('"",""');
    expect(csv).not.toContain("null");
    expect(csv).not.toContain("undefined");
  });

  it("keeps numbers", () => {
    expect(toCsv(["amount"], [[1000]])).toContain('"1000"');
  });

  it("stops a spreadsheet running a name as a formula", () => {
    const csv = toCsv(["الاسم"], [['=HYPERLINK("http://x","click")']]);

    expect(csv).toContain(`"'=HYPERLINK`);
  });

  it("defuses every character a spreadsheet treats as a formula", () => {
    for (const start of ["=", "+", "-", "@", "\t", "\r"]) {
      expect(toCsv(["h"], [[`${start}cmd`]])).toContain(`"'${start}cmd"`);
    }
  });

  it("leaves a negative amount as a number", () => {
    expect(toCsv(["amount"], [[-500]])).toContain('"-500"');
  });

  it("leaves an ordinary name alone", () => {
    expect(toCsv(["الاسم"], [["محمد"]])).toContain('"محمد"');
  });

  it("handles no rows", () => {
    expect(toCsv(["a"], [])).toBe(`${BOM}"a"`);
  });
});
