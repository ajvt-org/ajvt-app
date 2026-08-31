import { describe, it, expect } from "vitest";
import type { ImportedRow } from "./memberImportRun";
import { passwordsCsv, withPasswords } from "./memberImportPasswords";

function row(over: Partial<ImportedRow> = {}): ImportedRow {
  return {
    row: 1,
    outcome: "created",
    fullName: "محمد ولد أحمد",
    phone: "36000123",
    paid: false,
    ...over,
  };
}

describe("the temporary password list", () => {
  it("keeps only the rows that got a password", () => {
    const kept = withPasswords([
      row({ tempPassword: "123456" }),
      row({ row: 2 }),
      row({ row: 3, outcome: "failed" }),
    ]);

    expect(kept.map((r) => r.row)).toEqual([1]);
  });

  it("writes the name, the phone and the password", () => {
    const csv = passwordsCsv([row({ tempPassword: "123456" })]);

    expect(csv).toContain("محمد ولد أحمد");
    expect(csv).toContain("36000123");
    expect(csv).toContain("123456");
  });

  it("writes the headers even when no row got a password", () => {
    const csv = passwordsCsv([row()]);

    expect(csv).toContain("كلمة المرور المؤقتة");
    expect(csv.split("\n")).toHaveLength(1);
  });
});
