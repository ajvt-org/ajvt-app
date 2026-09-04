import { describe, it, expect } from "vitest";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import type { CheckContext, CheckedRow, RowMatch } from "@/lib/memberImportCheck";
import type { RowValues } from "@/lib/memberImportValues";
import {
  editableRows,
  fillValues,
  isRowBlocked,
  recheck,
  selectAll,
  selectRow,
  tally,
  toggleSkip,
  type EditableRow,
} from "./memberImportState";

const PAYMENT_METHODS = ["بنكيلي", "السداد", "مصرفي", "نقداً"];

const AGE = "الأولى";
const METHOD = PAYMENT_METHODS[0];
const FEE = 100;

const context: CheckContext = {
  villageNames: [HOME_VILLAGE, OTHER_VILLAGE],
  ageGroupNames: [AGE],
  membershipFee: FEE,
  paymentMethods: PAYMENT_METHODS,
};

function match(kind: RowMatch["kind"], hasMembership: boolean): RowMatch {
  return { kind, personId: `p${kind}`, fullName: "مطابق", hasMembership };
}

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

function selectedRows(rows: EditableRow[]): number[] {
  return rows.filter((row) => row.selected).map((row) => row.row);
}

describe("selectAll", () => {
  it("takes the rows a payment would land on and leaves the rest alone", () => {
    const rows = build([
      checked(1),
      checked(2, { phone: "22334455" }, match("phone", false)),
      checked(3, {}, match("name", true)),
      checked(4, {}, match("name", false)),
    ]);

    expect(selectedRows(selectAll(rows))).toEqual([1, 4]);
  });

  it("keeps a person who already holds this year's membership out", () => {
    const rows = build([checked(1, {}, match("name", true))]);

    expect(selectedRows(selectAll(rows))).toEqual([]);
  });

  it("takes a blocked row, since the block is shown and has to be fixed before importing", () => {
    const rows = build([checked(1, { age: "" })]);

    expect(isRowBlocked(rowAt(rows, 1))).toBe(true);
    expect(selectedRows(selectAll(rows))).toEqual([1]);
  });

  it("takes a matched row the admin chose to stop skipping", () => {
    const rows = build([checked(1, { phone: "22334455" }, match("phone", false))]);

    expect(selectedRows(selectAll(rows))).toEqual([]);
    expect(selectedRows(selectAll(toggleSkip(rows, 1, context)))).toEqual([1]);
  });

  it("counts what it selected rather than how many rows there are", () => {
    const rows = build([checked(1), checked(2, {}, match("name", true)), checked(3)]);

    expect(selectedRows(selectAll(rows))).toHaveLength(2);
    expect(rows).toHaveLength(3);
  });
});

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
    const rows = selectAll(
      build([checked(1, { age: "" }), checked(2, { village: OTHER_VILLAGE, age: "" })]),
    );

    const filled = fillValues(rows, { age: AGE }, context);

    expect(rowAt(filled, 1).values.age).toBe(AGE);
    expect(rowAt(filled, 2).values.age).toBe("");
  });

  it("rechecks, so the counters follow the fill", () => {
    const blocked = selectAll(build([checked(1, { age: "" })]));
    expect(tally(blocked).blocked).toBe(1);
    expect(tally(fillValues(blocked, { age: AGE }, context)).ready).toBe(1);

    const ready = selectAll(build([checked(1)]));
    expect(tally(ready).ready).toBe(1);
    expect(tally(fillValues(ready, { paid: true }, context)).blocked).toBe(1);
  });
});
