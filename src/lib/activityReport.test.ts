import { describe, it, expect } from "vitest";
import { activityReportRows, activityReportTotals } from "./activityReport";

const GENERAL = "بلا نشاط";

const pay = (
  activityId: string | null,
  amount: number,
  extra: { tags?: string[]; receiptNumber?: string | null } = {},
) => ({
  at: new Date("2026-03-01"),
  amount,
  activityId,
  tags: extra.tags ?? [],
  receiptNumber: extra.receiptNumber ?? null,
});

const spend = (activityId: string | null, amount: number, tags: string[] = []) => ({
  at: new Date("2026-03-02"),
  amount,
  activityId,
  tags,
});

const ACTIVITIES = [
  { id: "a1", title: "بطولة الصيف" },
  { id: "a2", title: "القافلة الصحية" },
];

describe("activityReportRows", () => {
  it("gives nothing back when the period holds no movement", () => {
    expect(activityReportRows(ACTIVITIES, [], [], GENERAL)).toHaveLength(0);
  });

  it("leaves out an activity with no money either way in the period", () => {
    const rows = activityReportRows(ACTIVITIES, [pay("a1", 500)], [], GENERAL);

    expect(rows.map((r) => r.activityId)).toEqual(["a1"]);
  });

  it("balances what came in against what went out", () => {
    const rows = activityReportRows(ACTIVITIES, [pay("a1", 500)], [spend("a1", 300)], GENERAL);

    expect(rows[0]).toMatchObject({ income: 500, spending: 300, balance: 200 });
  });

  it("reports a deficit as a negative balance", () => {
    const rows = activityReportRows(ACTIVITIES, [pay("a1", 100)], [spend("a1", 400)], GENERAL);

    expect(rows[0].balance).toBe(-300);
  });

  it("splits the spending by tag", () => {
    const rows = activityReportRows(
      ACTIVITIES,
      [],
      [spend("a1", 300, ["نقل"]), spend("a1", 200, ["نقل"]), spend("a1", 100, ["طعام"])],
      GENERAL,
    );

    expect(rows[0].spendingByTag).toEqual([
      { tag: "نقل", amount: 500 },
      { tag: "طعام", amount: 100 },
    ]);
  });

  it("keeps what is attached to no activity in a row of its own, last", () => {
    const rows = activityReportRows(
      ACTIVITIES,
      [pay("a1", 500), pay(null, 900)],
      [spend(null, 100)],
      GENERAL,
    );

    expect(rows.map((r) => r.title)).toEqual(["بطولة الصيف", GENERAL]);
    expect(rows.at(-1)).toMatchObject({ activityId: null, income: 900, spending: 100 });
  });

  it("drops the general row when everything is attached", () => {
    const rows = activityReportRows(ACTIVITIES, [pay("a1", 500)], [], GENERAL);

    expect(rows.every((r) => r.activityId !== null)).toBe(true);
  });

  it("orders the activities by how much money moved through them", () => {
    const rows = activityReportRows(
      ACTIVITIES,
      [pay("a1", 100), pay("a2", 900)],
      [spend("a1", 50)],
      GENERAL,
    );

    expect(rows.map((r) => r.activityId)).toEqual(["a2", "a1"]);
  });

  it("quotes each receipt once even when a number repeats", () => {
    const rows = activityReportRows(
      ACTIVITIES,
      [
        pay("a1", 100, { receiptNumber: "0002" }),
        pay("a1", 200, { receiptNumber: "0001" }),
        pay("a1", 300, { receiptNumber: "0001" }),
        pay("a1", 400),
      ],
      [],
      GENERAL,
    );

    expect(rows[0].receiptNumbers).toEqual(["0001", "0002"]);
  });
});

describe("activityReportTotals", () => {
  it("adds every row up, the general one included", () => {
    const rows = activityReportRows(
      ACTIVITIES,
      [pay("a1", 500), pay("a2", 300), pay(null, 200)],
      [spend("a1", 100), spend(null, 50)],
      GENERAL,
    );

    expect(activityReportTotals(rows)).toEqual({ income: 1000, spending: 150, balance: 850 });
  });

  it("is zero over an empty report", () => {
    expect(activityReportTotals([])).toEqual({ income: 0, spending: 0, balance: 0 });
  });
});
