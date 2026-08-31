import { describe, it, expect } from "vitest";
import { orderSupporters } from "./supportersOrder";

function row(key: string, name: string, total: number, reachedAt: string) {
  return { key, name, total, reachedAt: new Date(reachedAt) };
}

function names(rows: { name: string }[]) {
  return rows.map((r) => r.name);
}

describe("ordering the supporters board", () => {
  it("puts the larger total first", () => {
    const ordered = orderSupporters([
      row("b", "سالم", 500, "2026-01-01T00:00:00Z"),
      row("a", "أحمد", 900, "2026-01-02T00:00:00Z"),
    ]);

    expect(names(ordered)).toEqual(["أحمد", "سالم"]);
  });

  it("gives a shared total to whoever reached it first", () => {
    const ordered = orderSupporters([
      row("b", "سالم", 500, "2026-03-01T00:00:00Z"),
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
    ]);

    expect(names(ordered)).toEqual(["أحمد", "سالم"]);
  });

  it("separates three on one total by the moment each of them reached it", () => {
    const ordered = orderSupporters([
      row("c", "خديجة", 500, "2026-02-01T00:00:00Z"),
      row("a", "أحمد", 500, "2026-03-01T00:00:00Z"),
      row("b", "سالم", 500, "2026-01-01T00:00:00Z"),
    ]);

    expect(names(ordered)).toEqual(["سالم", "خديجة", "أحمد"]);
  });

  it("reads the time and not the day, so two who finished on one date still separate", () => {
    const ordered = orderSupporters([
      row("b", "سالم", 500, "2026-01-01T18:00:00Z"),
      row("a", "أحمد", 500, "2026-01-01T09:00:00Z"),
    ]);

    expect(names(ordered)).toEqual(["أحمد", "سالم"]);
  });

  it("falls back to the name when two reached the total at the same instant", () => {
    const ordered = orderSupporters([
      row("b", "سالم", 500, "2026-01-01T00:00:00Z"),
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
    ]);

    expect(names(ordered)).toEqual(["أحمد", "سالم"]);
  });

  it("falls back to the row key when the name matches too", () => {
    const ordered = orderSupporters([
      row("b", "أحمد", 500, "2026-01-01T00:00:00Z"),
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
    ]);

    expect(ordered.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("returns the same order whatever order the rows arrived in", () => {
    const rows = [
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
      row("b", "أحمد", 500, "2026-01-01T00:00:00Z"),
      row("c", "سالم", 500, "2026-01-01T00:00:00Z"),
      row("d", "خديجة", 900, "2026-05-01T00:00:00Z"),
    ];

    const forwards = orderSupporters(rows).map((r) => r.key);
    const backwards = orderSupporters([...rows].reverse()).map((r) => r.key);

    expect(backwards).toEqual(forwards);
  });

  it("numbers every row, so no two rows share a position", () => {
    const ordered = orderSupporters([
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
      row("b", "سالم", 500, "2026-01-01T00:00:00Z"),
      row("c", "خديجة", 500, "2026-01-01T00:00:00Z"),
    ]);

    expect(ordered.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it("leaves the rows it was handed alone", () => {
    const rows = [
      row("b", "سالم", 500, "2026-01-01T00:00:00Z"),
      row("a", "أحمد", 900, "2026-01-01T00:00:00Z"),
    ];

    orderSupporters(rows);

    expect(rows.map((r) => r.key)).toEqual(["b", "a"]);
  });
});
