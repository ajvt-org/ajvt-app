import { describe, it, expect } from "vitest";
import {
  attentionHref,
  groupAttention,
  sortAttention,
  type AttentionRow,
} from "@/lib/activityAttention";

function row(over: Partial<AttentionRow> = {}): AttentionRow {
  return {
    id: "join:1",
    kind: "join",
    activityId: "a1",
    activityTitle: "كأس الرابطة",
    who: "محمد",
    since: "2026-08-20T10:00:00.000Z",
    settle: null,
    ...over,
  };
}

describe("where a waiting item is cleared", () => {
  it("sends a join request to the teams tab", () => {
    expect(attentionHref(row())).toBe("/admin/activities/a1?tab=teams");
  });

  it("sends a registration to the registrations tab", () => {
    expect(attentionHref(row({ kind: "registration" }))).toBe(
      "/admin/activities/a1?tab=registrations",
    );
  });

  it("sends a proposed suspension to discipline", () => {
    expect(attentionHref(row({ kind: "suspension" }))).toBe("/admin/activities/a1?tab=discipline");
  });
});

describe("the order waiting items are read in", () => {
  const older = row({ id: "a", since: "2026-08-01T00:00:00.000Z" });
  const newer = row({ id: "b", since: "2026-08-20T00:00:00.000Z" });

  it("puts what has waited longest first by default", () => {
    expect(sortAttention([newer, older]).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("turns around when the admin asks for the newest", () => {
    expect(sortAttention([older, newer], true).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("keeps two items of the same age in a settled order", () => {
    const first = row({ id: "a", since: "2026-08-01T00:00:00.000Z" });
    const second = row({ id: "b", since: "2026-08-01T00:00:00.000Z" });

    expect(sortAttention([second, first]).map((r) => r.id)).toEqual(["a", "b"]);
    expect(sortAttention([second, first], true).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("leaves what it was given alone", () => {
    const rows = [newer, older];
    sortAttention(rows);

    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("has nothing to sort when nothing is waiting", () => {
    expect(sortAttention([])).toEqual([]);
  });
});

describe("how waiting items are grouped", () => {
  it("keeps each kind together with the rest of its kind", () => {
    const rows = [
      row({ id: "j", kind: "join" }),
      row({ id: "r", kind: "registration" }),
      row({ id: "j2", kind: "join" }),
    ];

    expect(groupAttention(rows).map((g) => [g.kind, g.rows.length])).toEqual([
      ["join", 2],
      ["registration", 1],
    ]);
  });

  it("leaves out a kind that has nothing waiting", () => {
    expect(groupAttention([row({ kind: "suspension" })]).map((g) => g.kind)).toEqual([
      "suspension",
    ]);
  });

  it("holds the same order of kinds whatever arrives first", () => {
    const kinds = (rows: AttentionRow[]) => groupAttention(rows).map((g) => g.kind);
    const join = row({ id: "j", kind: "join" });
    const suspension = row({ id: "s", kind: "suspension" });

    expect(kinds([suspension, join])).toEqual(kinds([join, suspension]));
  });

  it("orders inside a group by how long it has waited", () => {
    const old = row({ id: "old", since: "2026-01-01T00:00:00.000Z" });
    const recent = row({ id: "new", since: "2026-08-28T00:00:00.000Z" });

    expect(groupAttention([recent, old])[0].rows.map((r) => r.id)).toEqual(["old", "new"]);
    expect(groupAttention([old, recent], true)[0].rows.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("has no groups when nothing is waiting", () => {
    expect(groupAttention([])).toEqual([]);
  });
});
