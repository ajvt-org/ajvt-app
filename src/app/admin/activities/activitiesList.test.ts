import { describe, it, expect } from "vitest";
import { pendingCount, registeredCount, splitByStage } from "./activitiesList";

const NOW = new Date("2026-08-29T12:00:00.000Z");

function row(id: string, over: Record<string, unknown> = {}) {
  return { id, order: 0, startsAt: null, endsAt: null, isOpen: true, ...over };
}

describe("splitting the list into what is on and what is over", () => {
  it("keeps a finished activity out of the current section", () => {
    const done = row("done", { startsAt: "2026-08-01", endsAt: "2026-08-02" });
    const live = row("live", { startsAt: "2026-08-28", endsAt: "2026-08-30" });

    const split = splitByStage([done, live], NOW);

    expect(split.current.map((r) => r.id)).toEqual(["live"]);
    expect(split.finished.map((r) => r.id)).toEqual(["done"]);
  });

  it("counts an upcoming activity as current", () => {
    const soon = row("soon", { startsAt: "2026-09-12", endsAt: "2026-09-13" });

    expect(splitByStage([soon], NOW).current.map((r) => r.id)).toEqual(["soon"]);
  });

  it("counts an activity with no dates as current, open or closed", () => {
    const split = splitByStage([row("a"), row("b", { isOpen: false })], NOW);

    expect(split.current.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(split.finished).toEqual([]);
  });

  it("keeps the public order inside each section", () => {
    const split = splitByStage([row("second", { order: 5 }), row("first", { order: 1 })], NOW);

    expect(split.current.map((r) => r.id)).toEqual(["first", "second"]);
  });

  it("has two empty sections for an empty list", () => {
    expect(splitByStage([], NOW)).toEqual({ current: [], finished: [] });
  });
});

describe("what a row counts", () => {
  const registrations = (...statuses: string[]) => ({
    registrations: statuses.map((status) => ({ status })),
  });

  it("counts everyone who was not turned away", () => {
    expect(registeredCount(registrations("ACTIVE", "PENDING", "REJECTED"))).toBe(2);
  });

  it("counts only what is still waiting as pending", () => {
    expect(pendingCount(registrations("ACTIVE", "PENDING", "PENDING"))).toBe(2);
  });

  it("counts nothing on an activity nobody asked for", () => {
    expect(registeredCount(registrations())).toBe(0);
    expect(pendingCount(registrations())).toBe(0);
  });
});
