import { describe, it, expect } from "vitest";
import { rankSupporters } from "./supportersOrder";

function row(key: string, name: string, total: number, reachedAt: string) {
  return { key, name, total, reachedAt: new Date(reachedAt) };
}

function names(rows: { name: string }[]) {
  return rows.map((r) => r.name);
}

describe("ordering the supporters board", () => {
  it("puts the larger total first", () => {
    const ordered = rankSupporters([
      row("b", "سالم", 500, "2026-01-01T00:00:00Z"),
      row("a", "أحمد", 900, "2026-01-02T00:00:00Z"),
    ]);

    expect(names(ordered)).toEqual(["أحمد", "سالم"]);
  });

  it("gives a shared total to whoever reached it first", () => {
    const ordered = rankSupporters([
      row("b", "سالم", 500, "2026-03-01T00:00:00Z"),
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
    ]);

    expect(names(ordered)).toEqual(["أحمد", "سالم"]);
  });

  it("separates three on one total by the moment each of them reached it", () => {
    const ordered = rankSupporters([
      row("c", "خديجة", 500, "2026-02-01T00:00:00Z"),
      row("a", "أحمد", 500, "2026-03-01T00:00:00Z"),
      row("b", "سالم", 500, "2026-01-01T00:00:00Z"),
    ]);

    expect(names(ordered)).toEqual(["سالم", "خديجة", "أحمد"]);
  });

  it("reads the time and not the day, so two who finished on one date still separate", () => {
    const ordered = rankSupporters([
      row("b", "سالم", 500, "2026-01-01T18:00:00Z"),
      row("a", "أحمد", 500, "2026-01-01T09:00:00Z"),
    ]);

    expect(names(ordered)).toEqual(["أحمد", "سالم"]);
  });

  it("falls back to the name when two reached the total at the same instant", () => {
    const ordered = rankSupporters([
      row("b", "سالم", 500, "2026-01-01T00:00:00Z"),
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
    ]);

    expect(names(ordered)).toEqual(["أحمد", "سالم"]);
  });

  it("falls back to the row key when the name matches too", () => {
    const ordered = rankSupporters([
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

    const forwards = rankSupporters(rows).map((r) => r.key);
    const backwards = rankSupporters([...rows].reverse()).map((r) => r.key);

    expect(backwards).toEqual(forwards);
  });

  it("numbers every row, so no two rows share a position", () => {
    const ordered = rankSupporters([
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

    rankSupporters(rows);

    expect(rows.map((r) => r.key)).toEqual(["b", "a"]);
  });

  it("gives two supporters on one total the same place", () => {
    const ranked = rankSupporters([
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
      row("b", "سالم", 500, "2026-02-01T00:00:00Z"),
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 1]);
  });

  it("skips the place the shared one used up, so first, first, third", () => {
    const ranked = rankSupporters([
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
      row("b", "سالم", 500, "2026-02-01T00:00:00Z"),
      row("c", "خديجة", 300, "2026-01-01T00:00:00Z"),
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("skips as many places as the tie was wide", () => {
    const ranked = rankSupporters([
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
      row("b", "سالم", 500, "2026-02-01T00:00:00Z"),
      row("c", "خديجة", 500, "2026-03-01T00:00:00Z"),
      row("d", "مريم", 300, "2026-01-01T00:00:00Z"),
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 1, 4]);
  });

  it("keeps the position unique where the place is shared", () => {
    const ranked = rankSupporters([
      row("a", "أحمد", 500, "2026-01-01T00:00:00Z"),
      row("b", "سالم", 500, "2026-02-01T00:00:00Z"),
      row("c", "خديجة", 300, "2026-01-01T00:00:00Z"),
    ]);

    expect(ranked.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it("numbers a board with no ties the way it always did", () => {
    const ranked = rankSupporters([
      row("a", "أحمد", 900, "2026-01-01T00:00:00Z"),
      row("b", "سالم", 500, "2026-01-01T00:00:00Z"),
      row("c", "خديجة", 300, "2026-01-01T00:00:00Z"),
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("shares a place further down the board too", () => {
    const ranked = rankSupporters([
      row("a", "أحمد", 900, "2026-01-01T00:00:00Z"),
      row("b", "سالم", 500, "2026-01-01T00:00:00Z"),
      row("c", "خديجة", 500, "2026-02-01T00:00:00Z"),
      row("d", "مريم", 100, "2026-01-01T00:00:00Z"),
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });
});
