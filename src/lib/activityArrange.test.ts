import { describe, it, expect } from "vitest";
import { arrangedGroups, moveWithinStage, type Arrangeable } from "@/lib/activityArrange";

const NOW = new Date("2026-08-29T12:00:00.000Z");

function row(id: string, order: number, over: Partial<Arrangeable> = {}): Arrangeable {
  return { id, order, startsAt: null, endsAt: null, isOpen: true, ...over };
}

const live = (id: string, order: number) =>
  row(id, order, { startsAt: "2026-08-28", endsAt: "2026-08-30" });
const finished = (id: string, order: number) =>
  row(id, order, { startsAt: "2026-08-01", endsAt: "2026-08-02" });

describe("grouping the list the way the public reads it", () => {
  it("keeps each stage in its own group, running before finished", () => {
    const groups = arrangedGroups([finished("done", 1), live("now", 2)], NOW);

    expect(groups.map((g) => g.stage)).toEqual(["live", "finished"]);
    expect(groups[0].rows.map((r) => r.id)).toEqual(["now"]);
  });

  it("orders inside a group by the order the admin set", () => {
    const groups = arrangedGroups([row("second", 5), row("first", 1)], NOW);

    expect(groups[0].rows.map((r) => r.id)).toEqual(["first", "second"]);
  });

  it("has no groups for an empty list", () => {
    expect(arrangedGroups([], NOW)).toEqual([]);
  });
});

describe("moving an activity inside its stage", () => {
  it("swaps it with the one above", () => {
    const rows = [row("a", 0), row("b", 1), row("c", 2)];

    expect(moveWithinStage(rows, "b", -1, NOW)).toEqual([
      { id: "b", order: 0 },
      { id: "a", order: 1 },
    ]);
  });

  it("swaps it with the one below", () => {
    const rows = [row("a", 0), row("b", 1), row("c", 2)];

    expect(moveWithinStage(rows, "b", 1, NOW)).toEqual([
      { id: "c", order: 1 },
      { id: "b", order: 2 },
    ]);
  });

  it("does nothing at the top of a stage", () => {
    expect(moveWithinStage([row("a", 0), row("b", 1)], "a", -1, NOW)).toEqual([]);
  });

  it("does nothing at the bottom of a stage", () => {
    expect(moveWithinStage([row("a", 0), row("b", 1)], "b", 1, NOW)).toEqual([]);
  });

  it("never moves an activity out of its own stage", () => {
    const rows = [live("now", 0), finished("done", 1)];

    expect(moveWithinStage(rows, "done", -1, NOW)).toEqual([]);
  });

  it("counts positions across the whole list, not inside the group", () => {
    const rows = [live("now", 0), row("a", 1), row("b", 2)];

    expect(moveWithinStage(rows, "b", -1, NOW)).toEqual([
      { id: "b", order: 1 },
      { id: "a", order: 2 },
    ]);
  });

  it("settles a list whose orders were all the same", () => {
    const rows = [row("a", 0), row("b", 0), row("c", 0)];

    expect(moveWithinStage(rows, "c", -1, NOW)).toEqual([
      { id: "c", order: 1 },
      { id: "b", order: 2 },
    ]);
  });

  it("does nothing for an activity that is not there", () => {
    expect(moveWithinStage([row("a", 0)], "gone", 1, NOW)).toEqual([]);
  });
});
