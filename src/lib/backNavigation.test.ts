import { describe, it, expect } from "vitest";
import { backMove } from "./backNavigation";
import { createTrail } from "./historyTrail";

describe("backMove", () => {
  it("unwinds when the entry behind the reader is the parent", () => {
    const trail = createTrail();
    trail.noteLocation("/activities");
    trail.noteLocation("/activities/a1");

    expect(backMove("/activities", trail)).toBe("unwind");
  });

  it("replaces when the reader arrived from somewhere that is not the parent", () => {
    const trail = createTrail();
    trail.noteLocation("/donate");
    trail.noteLocation("/activities/a1");

    expect(backMove("/activities", trail)).toBe("replace");
  });

  it("replaces on a cold arrival, so the reader goes up rather than out of the app", () => {
    const trail = createTrail();
    trail.noteLocation("/activities/a1");

    expect(backMove("/activities", trail)).toBe("replace");
  });

  it("replaces where the parent sits ahead of the reader rather than behind", () => {
    const trail = createTrail();
    trail.noteLocation("/activities");
    trail.noteLocation("/activities/a1");
    trail.notePop();
    trail.noteLocation("/activities");

    expect(backMove("/activities/a1", trail)).toBe("replace");
  });

  it("reads the trail again on every call, so a tab switch changes the answer", () => {
    const trail = createTrail();
    trail.noteLocation("/activities");
    trail.noteLocation("/activities/a1");
    expect(backMove("/activities", trail)).toBe("unwind");

    trail.noteLocation("/leaderboard");
    trail.noteLocation("/activities/a1");
    expect(backMove("/activities", trail)).toBe("replace");
  });
});
