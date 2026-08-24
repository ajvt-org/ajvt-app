import { describe, it, expect } from "vitest";
import {
  byMonth,
  byTag,
  monthKey,
  monthsBetween,
  sumOf,
  tagTotal,
  UNTAGGED,
} from "./financeReport";

const at = (iso: string) => new Date(iso);
const entry = (iso: string, amount: number, tags: string[] = []) => ({
  at: at(iso),
  amount,
  tags,
});

describe("monthKey", () => {
  it("reads the month a date falls in", () => {
    expect(monthKey(at("2026-08-21T23:59:59.000Z"))).toBe("2026-08");
  });

  it("reads the first instant of a month as that month", () => {
    expect(monthKey(at("2026-01-01T00:00:00.000Z"))).toBe("2026-01");
  });
});

describe("monthsBetween", () => {
  it("names every month the period touches", () => {
    expect(monthsBetween(at("2026-01-15T00:00:00Z"), at("2026-04-02T00:00:00Z"))).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
  });

  it("names one month for a period inside a single month", () => {
    expect(monthsBetween(at("2026-03-02T00:00:00Z"), at("2026-03-28T00:00:00Z"))).toEqual([
      "2026-03",
    ]);
  });

  it("crosses a year end", () => {
    expect(monthsBetween(at("2025-11-20T00:00:00Z"), at("2026-01-05T00:00:00Z"))).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });

  it("names nothing when the period runs backwards", () => {
    expect(monthsBetween(at("2026-05-01T00:00:00Z"), at("2026-03-01T00:00:00Z"))).toEqual([]);
  });
});

describe("byMonth", () => {
  it("puts income and spending against the month they fall in", () => {
    const rows = byMonth(
      [entry("2026-01-10T00:00:00Z", 500)],
      [entry("2026-02-05T00:00:00Z", 200)],
      at("2026-01-01T00:00:00Z"),
      at("2026-02-28T00:00:00Z"),
    );

    expect(rows).toEqual([
      { month: "2026-01", income: 500, spending: 0, net: 500 },
      { month: "2026-02", income: 0, spending: 200, net: -200 },
    ]);
  });

  it("keeps a month with no movement in the report rather than skipping it", () => {
    const rows = byMonth(
      [entry("2026-01-10T00:00:00Z", 500)],
      [],
      at("2026-01-01T00:00:00Z"),
      at("2026-03-31T00:00:00Z"),
    );

    expect(rows.map((r) => r.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(rows[1]).toEqual({ month: "2026-02", income: 0, spending: 0, net: 0 });
  });

  it("adds several movements in one month together", () => {
    const rows = byMonth(
      [entry("2026-01-02T00:00:00Z", 300), entry("2026-01-20T00:00:00Z", 200)],
      [entry("2026-01-15T00:00:00Z", 100)],
      at("2026-01-01T00:00:00Z"),
      at("2026-01-31T00:00:00Z"),
    );

    expect(rows).toEqual([{ month: "2026-01", income: 500, spending: 100, net: 400 }]);
  });

  it("reports a month that spent more than it took as negative", () => {
    const rows = byMonth(
      [entry("2026-01-02T00:00:00Z", 100)],
      [entry("2026-01-15T00:00:00Z", 900)],
      at("2026-01-01T00:00:00Z"),
      at("2026-01-31T00:00:00Z"),
    );

    expect(rows[0].net).toBe(-800);
  });

  it("orders the months oldest first, as a report reads", () => {
    const rows = byMonth([], [], at("2026-01-01T00:00:00Z"), at("2026-03-31T00:00:00Z"));

    expect(rows.map((r) => r.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });
});

describe("byTag", () => {
  it("adds up what each tag carried", () => {
    expect(
      byTag([
        entry("2026-01-01T00:00:00Z", 300, ["كرة"]),
        entry("2026-01-02T00:00:00Z", 200, ["كرة"]),
      ]),
    ).toEqual([{ tag: "كرة", amount: 500 }]);
  });

  it("counts an entry under each of its tags", () => {
    expect(byTag([entry("2026-01-01T00:00:00Z", 100, ["كرة", "سفر"])])).toEqual([
      { tag: "سفر", amount: 100 },
      { tag: "كرة", amount: 100 },
    ]);
  });

  it("gathers what carries no tag rather than dropping it", () => {
    expect(byTag([entry("2026-01-01T00:00:00Z", 700)])).toEqual([{ tag: UNTAGGED, amount: 700 }]);
  });

  it("puts the largest tag first", () => {
    const rows = byTag([
      entry("2026-01-01T00:00:00Z", 100, ["صغير"]),
      entry("2026-01-02T00:00:00Z", 900, ["كبير"]),
    ]);

    expect(rows.map((r) => r.tag)).toEqual(["كبير", "صغير"]);
  });

  it("answers nothing for a period with no movement", () => {
    expect(byTag([])).toEqual([]);
  });
});

describe("sumOf", () => {
  it("totals what is there", () => {
    expect(sumOf([entry("2026-01-01T00:00:00Z", 100), entry("2026-01-02T00:00:00Z", 250)])).toBe(
      350,
    );
  });

  it("is nothing for an empty period", () => {
    expect(sumOf([])).toBe(0);
  });
});

describe("tagTotal", () => {
  it("adds the rows up", () => {
    expect(
      tagTotal([
        { tag: "أ", amount: 300 },
        { tag: "ب", amount: 200 },
      ]),
    ).toBe(500);
  });

  it("is zero with nothing tagged", () => {
    expect(tagTotal([])).toBe(0);
  });

  it("runs past the real total when one entry carries two tags", () => {
    const rows = byTag([{ at: new Date("2026-01-05"), amount: 100, tags: ["أ", "ب"] }]);

    expect(tagTotal(rows)).toBe(200);
  });
});
