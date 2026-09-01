import { describe, it, expect } from "vitest";
import { PAYMENT_METHODS } from "@/lib/donations";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import type { CheckContext, CheckedRow, RowMatch } from "@/lib/memberImportCheck";
import type { RowValues } from "@/lib/memberImportValues";
import {
  editableRows,
  fillValues,
  recheck,
  selectRow,
  tally,
  type EditableRow,
} from "./memberImportState";

const AGE = "الأولى";
const METHOD = PAYMENT_METHODS[0];
const FEE = 100;

const context: CheckContext = {
  villageNames: [HOME_VILLAGE, OTHER_VILLAGE],
  ageGroupNames: [AGE],
  membershipFee: FEE,
  paymentMethods: PAYMENT_METHODS,
};

function checked(row: number, over: Partial<RowValues> = {}, found: RowMatch | null = null) {
  const values: RowValues = {
    fullName: `المستورد ${row}`,
    phone: "",
    village: HOME_VILLAGE,
    age: AGE,
    paid: false,
    paymentMethod: "",
    paidAmount: "",
    ...over,
  };
  return { row, values, issues: [], match: found } satisfies CheckedRow;
}

function build(rows: CheckedRow[]): EditableRow[] {
  return recheck(editableRows(rows), context);
}

function rowAt(rows: EditableRow[], at: number): EditableRow {
  const found = rows.find((row) => row.row === at);
  if (!found) throw new Error(`no row ${at}`);
  return found;
}

describe("fillValues", () => {
  function twoSelected() {
    const rows = build([checked(1), checked(2), checked(3)]);
    return selectRow(selectRow(rows, 1, true), 2, true);
  }

  it("sets the payment across the selection and leaves the rest untouched", () => {
    const filled = fillValues(
      twoSelected(),
      { paid: true, paymentMethod: METHOD, paidAmount: "" },
      context,
    );

    expect(rowAt(filled, 1).values).toMatchObject({ paid: true, paymentMethod: METHOD });
    expect(rowAt(filled, 2).values).toMatchObject({ paid: true, paymentMethod: METHOD });
    expect(rowAt(filled, 3).values.paid).toBe(false);
  });

  it("leaves a blank amount blank, so the fee applies when the row is imported", () => {
    const filled = fillValues(twoSelected(), { paid: true, paymentMethod: METHOD }, context);

    expect(rowAt(filled, 1).values.paidAmount).toBe("");
    expect(tally(filled).blocked).toBe(0);
  });

  it("blocks the rows when paid is set with no method", () => {
    const filled = fillValues(twoSelected(), { paid: true }, context);

    expect(tally(filled).blocked).toBe(2);
    expect(tally(filled).ready).toBe(1);
  });

  it("blocks the rows when the amount is below the fee", () => {
    const filled = fillValues(
      twoSelected(),
      { paid: true, paymentMethod: METHOD, paidAmount: String(FEE - 1) },
      context,
    );

    expect(rowAt(filled, 1).issues.some((issue) => issue.field === "paidAmount")).toBe(true);
    expect(tally(filled).blocked).toBe(2);
  });

  it("keeps an amount above the fee", () => {
    const filled = fillValues(
      twoSelected(),
      { paid: true, paymentMethod: METHOD, paidAmount: String(FEE * 2) },
      context,
    );

    expect(rowAt(filled, 1).values.paidAmount).toBe(String(FEE * 2));
    expect(tally(filled).blocked).toBe(0);
  });

  it("gives the age group only to the villages that take one", () => {
    const built = build([checked(1, { age: "" }), checked(2, { village: OTHER_VILLAGE, age: "" })]);
    const rows = selectRow(selectRow(built, 1, true), 2, true);

    const filled = fillValues(rows, { age: AGE }, context);

    expect(rowAt(filled, 1).values.age).toBe(AGE);
    expect(rowAt(filled, 2).values.age).toBe("");
  });

  it("rechecks, so the counters follow the fill", () => {
    const blocked = selectRow(build([checked(1, { age: "" })]), 1, true);
    expect(tally(blocked).blocked).toBe(1);
    expect(tally(fillValues(blocked, { age: AGE }, context)).ready).toBe(1);

    const ready = selectRow(build([checked(1)]), 1, true);
    expect(tally(ready).ready).toBe(1);
    expect(tally(fillValues(ready, { paid: true }, context)).blocked).toBe(1);
  });
});
