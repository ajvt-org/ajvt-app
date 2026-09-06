import { describe, it, expect } from "vitest";
import { createTrail } from "./historyTrail";

describe("historyTrail previousIs", () => {
  it("says no on the screen the document opened on", () => {
    const trail = createTrail();
    trail.noteLocation("/activities/a1");

    expect(trail.previousIs("/activities")).toBe(false);
  });

  it("says yes when the reader came from that screen", () => {
    const trail = createTrail();
    trail.noteLocation("/activities");
    trail.noteLocation("/activities/a1");

    expect(trail.previousIs("/activities")).toBe(true);
  });

  it("says no when the reader came from somewhere else", () => {
    const trail = createTrail();
    trail.noteLocation("/supporters");
    trail.noteLocation("/activities/a1");

    expect(trail.previousIs("/activities")).toBe(false);
  });

  it("follows the reader back, so the entry behind is the one behind now", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/activities");
    trail.noteLocation("/activities/a1");
    trail.notePop();
    trail.noteLocation("/activities");

    expect(trail.previousIs("/")).toBe(true);
    expect(trail.previousIs("/activities/a1")).toBe(false);
  });

  it("tells a query apart from the path it hangs on", () => {
    const trail = createTrail();
    trail.noteLocation("/activities?from=home");
    trail.noteLocation("/activities/a1");

    expect(trail.previousIs("/activities")).toBe(false);
    expect(trail.previousIs("/activities?from=home")).toBe(true);
  });
});

describe("historyTrail noteLocation", () => {
  it("keeps the screen the reader came from behind them", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/register");

    expect(trail.previousIs("/")).toBe(true);
  });

  it("empties out again when the reader goes back to where they started", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.notePop();
    trail.noteLocation("/");

    expect(trail.previousIs("/register")).toBe(false);
    expect(trail.previousIs("/")).toBe(false);
  });

  it("counts the entry again when the reader goes forward", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.notePop();
    trail.noteLocation("/");
    trail.notePop();
    trail.noteLocation("/register");

    expect(trail.previousIs("/")).toBe(true);
  });

  it("drops the entries ahead when the reader leaves in a new direction", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.notePop();
    trail.noteLocation("/");
    trail.noteLocation("/activities");

    expect(trail.previousIs("/")).toBe(true);
    expect(trail.previousIs("/register")).toBe(false);
  });

  it("treats a return to a screen the reader has seen as the push it is", () => {
    const trail = createTrail();
    trail.noteLocation("/activities");
    trail.noteLocation("/activities/a1");
    trail.noteLocation("/leaderboard");
    trail.noteLocation("/activities/a1");

    expect(trail.previousIs("/leaderboard")).toBe(true);
    expect(trail.previousIs("/activities")).toBe(false);
  });

  it("gives up rather than guess when the reader jumps several entries at once", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/activities");
    trail.noteLocation("/activities/a1");
    trail.notePop();
    trail.noteLocation("/");

    expect(trail.previousIs("/")).toBe(false);
    expect(trail.previousIs("/activities")).toBe(false);
  });

  it("ignores a render that lands on the screen already showing", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.noteLocation("/register");

    expect(trail.previousIs("/")).toBe(true);
  });
});

describe("historyTrail noteReplacement", () => {
  it("stands in the replaced entry's place rather than behind it", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/activities/a1");
    trail.noteReplacement("/activities");

    expect(trail.previousIs("/")).toBe(true);
    expect(trail.previousIs("/activities/a1")).toBe(false);
  });

  it("leaves the render that follows it with nothing to record", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/activities/a1");
    trail.noteReplacement("/activities");
    trail.noteLocation("/activities");

    expect(trail.previousIs("/")).toBe(true);
  });

  it("drops the entries ahead, because a replacement destroys them", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/activities");
    trail.noteLocation("/activities/a1");
    trail.noteLocation("/activities");
    trail.noteReplacement("/home");
    trail.noteLocation("/activities/a1");

    expect(trail.previousIs("/home")).toBe(true);
  });

  it("records the first screen when there is nothing to replace", () => {
    const trail = createTrail();
    trail.noteReplacement("/activities");
    trail.noteLocation("/activities/a1");

    expect(trail.previousIs("/activities")).toBe(true);
  });
});
