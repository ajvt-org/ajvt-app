import { describe, it, expect } from "vitest";
import { activityReportRows, activityReportTotals } from "./activityReport";
import type { MoneyDestination } from "./moneyDestination";

const GENERAL = "بلا نشاط";

const at = (destination: MoneyDestination) => ({
  activityId: destination.activityId ?? null,
  competitionId: destination.competitionId ?? null,
});

const pay = (
  destination: MoneyDestination,
  amount: number,
  extra: { tags?: string[]; receiptNumber?: string | null } = {},
) => ({
  at: new Date("2026-03-01"),
  amount,
  ...at(destination),
  tags: extra.tags ?? [],
  receiptNumber: extra.receiptNumber ?? null,
});

const spend = (destination: MoneyDestination, amount: number, tags: string[] = []) => ({
  at: new Date("2026-03-02"),
  amount,
  ...at(destination),
  tags,
});

const activity = (activityId: string) => ({ activityId });
const quiz = (competitionId: string) => ({ competitionId });
const nowhere = {};

const ACTIVITIES = [
  { id: "a1", title: "بطولة الصيف" },
  { id: "a2", title: "القافلة الصحية" },
];

const COMPETITIONS = [
  { id: "c1", name: "مسابقة رمضان" },
  { id: "c2", name: "مسابقة السيرة" },
];

const rowsOf = (payments: ReturnType<typeof pay>[], expenses: ReturnType<typeof spend>[] = []) =>
  activityReportRows(ACTIVITIES, COMPETITIONS, payments, expenses, GENERAL);

describe("activityReportRows", () => {
  it("gives nothing back when the period holds no movement", () => {
    expect(rowsOf([], [])).toHaveLength(0);
  });

  it("leaves out an activity with no money either way in the period", () => {
    expect(rowsOf([pay(activity("a1"), 500)]).map((r) => r.key)).toEqual(["a1"]);
  });

  it("balances what came in against what went out", () => {
    const rows = rowsOf([pay(activity("a1"), 500)], [spend(activity("a1"), 300)]);

    expect(rows[0]).toMatchObject({ income: 500, spending: 300, balance: 200 });
  });

  it("reports a deficit as a negative balance", () => {
    const rows = rowsOf([pay(activity("a1"), 100)], [spend(activity("a1"), 400)]);

    expect(rows[0].balance).toBe(-300);
  });

  it("splits the spending by tag", () => {
    const rows = rowsOf(
      [],
      [
        spend(activity("a1"), 300, ["نقل"]),
        spend(activity("a1"), 200, ["نقل"]),
        spend(activity("a1"), 100, ["طعام"]),
      ],
    );

    expect(rows[0].spendingByTag).toEqual([
      { tag: "نقل", amount: 500 },
      { tag: "طعام", amount: 100 },
    ]);
  });

  it("keeps what is attached to nothing in a row of its own, last", () => {
    const rows = rowsOf([pay(activity("a1"), 500), pay(nowhere, 900)], [spend(nowhere, 100)]);

    expect(rows.map((r) => r.title)).toEqual(["بطولة الصيف", GENERAL]);
    expect(rows.at(-1)).toMatchObject({ kind: "general", income: 900, spending: 100 });
  });

  it("drops the general row when everything is attached", () => {
    expect(rowsOf([pay(activity("a1"), 500)]).every((r) => r.kind !== "general")).toBe(true);
  });

  it("orders by how much money moved, whichever kind it moved through", () => {
    const rows = rowsOf(
      [pay(activity("a1"), 100), pay(quiz("c1"), 900), pay(activity("a2"), 400)],
      [spend(activity("a1"), 50)],
    );

    expect(rows.map((r) => r.key)).toEqual(["c1", "a2", "a1"]);
  });

  it("quotes each receipt once even when a number repeats", () => {
    const rows = rowsOf([
      pay(activity("a1"), 100, { receiptNumber: "0002" }),
      pay(activity("a1"), 200, { receiptNumber: "0001" }),
      pay(activity("a1"), 300, { receiptNumber: "0001" }),
      pay(activity("a1"), 400),
    ]);

    expect(rows[0].receiptNumbers).toEqual(["0001", "0002"]);
  });
});

describe("a competition in the activity report", () => {
  it("gets a row of its own, named after the quiz", () => {
    const rows = rowsOf([pay(quiz("c1"), 900)], [spend(quiz("c1"), 400)]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: "c1",
      kind: "competition",
      title: "مسابقة رمضان",
      income: 900,
      spending: 400,
      balance: 500,
    });
  });

  it("does not fall into the general row, which is what made the report wrong", () => {
    const rows = rowsOf([pay(quiz("c1"), 900)]);

    expect(rows.some((r) => r.kind === "general")).toBe(false);
  });

  it("keeps each quiz apart from the others and from the activities", () => {
    const rows = rowsOf([
      pay(quiz("c1"), 900),
      pay(quiz("c2"), 300),
      pay(activity("a1"), 500),
      pay(nowhere, 100),
    ]);

    expect(rows.map((r) => [r.key, r.income])).toEqual([
      ["c1", 900],
      ["a1", 500],
      ["c2", 300],
      ["general", 100],
    ]);
  });

  it("leaves out a quiz no money moved through", () => {
    expect(rowsOf([pay(quiz("c1"), 900)]).map((r) => r.key)).toEqual(["c1"]);
  });
});

describe("activityReportTotals", () => {
  it("adds every row up, the quiz and the general one included", () => {
    const rows = rowsOf(
      [pay(activity("a1"), 500), pay(quiz("c1"), 300), pay(nowhere, 200)],
      [spend(activity("a1"), 100), spend(quiz("c1"), 50)],
    );

    expect(activityReportTotals(rows)).toEqual({ income: 1000, spending: 150, balance: 850 });
  });

  it("is zero over an empty report", () => {
    expect(activityReportTotals([])).toEqual({ income: 0, spending: 0, balance: 0 });
  });
});
