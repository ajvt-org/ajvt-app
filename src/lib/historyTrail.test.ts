import { describe, it, expect } from "vitest";
import { createTrail } from "./historyTrail";

describe("historyTrail", () => {
  it("has nothing to unwind on the screen the document opened on", () => {
    const trail = createTrail();
    trail.noteLocation("/register");

    expect(trail.canUnwind()).toBe(false);
  });

  it("has something to unwind once the reader has moved on", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/register");

    expect(trail.canUnwind()).toBe(true);
  });

  it("comes back to nothing when the reader returns to where they started", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.noteLocation("/");

    expect(trail.canUnwind()).toBe(false);
  });

  it("counts the entry again when the reader goes forward", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.noteLocation("/");
    trail.noteLocation("/register");

    expect(trail.canUnwind()).toBe(true);
  });

  it("drops the entries ahead when the reader leaves in a new direction", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.noteLocation("/");
    trail.noteLocation("/activities");
    trail.noteLocation("/");

    expect(trail.canUnwind()).toBe(false);
  });

  it("ignores a render that lands on the screen already showing", () => {
    const trail = createTrail();
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.noteLocation("/register");
    trail.noteLocation("/");

    expect(trail.canUnwind()).toBe(false);
  });

  it("tells a query apart from the path it hangs on", () => {
    const trail = createTrail();
    trail.noteLocation("/quiz");
    trail.noteLocation("/quiz?competition=c1");

    expect(trail.canUnwind()).toBe(true);
  });

  it("has nothing to unwind on a tab opened from another screen of the app", () => {
    const trail = createTrail();
    trail.noteLocation("/quiz");

    expect(trail.canUnwind()).toBe(false);
  });
});

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
