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

  it("handles no rows", () => {
    expect(toCsv(["a"], [])).toBe(`${BOM}"a"`);
  });
});
