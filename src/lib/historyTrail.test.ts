import { describe, it, expect } from "vitest";
import { createTrail } from "./historyTrail";

const cold = () => false;

describe("historyTrail", () => {
  it("has nothing to unwind on the screen the document opened on", () => {
    const trail = createTrail(cold);
    trail.noteLocation("/register");

    expect(trail.canUnwind()).toBe(false);
  });

  it("has something to unwind once the reader has moved on", () => {
    const trail = createTrail(cold);
    trail.noteLocation("/");
    trail.noteLocation("/register");

    expect(trail.canUnwind()).toBe(true);
  });

  it("comes back to nothing when the reader returns to where they started", () => {
    const trail = createTrail(cold);
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.noteLocation("/");

    expect(trail.canUnwind()).toBe(false);
  });

  it("counts the entry again when the reader goes forward", () => {
    const trail = createTrail(cold);
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.noteLocation("/");
    trail.noteLocation("/register");

    expect(trail.canUnwind()).toBe(true);
  });

  it("drops the entries ahead when the reader leaves in a new direction", () => {
    const trail = createTrail(cold);
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.noteLocation("/");
    trail.noteLocation("/activities");
    trail.noteLocation("/");

    expect(trail.canUnwind()).toBe(false);
  });

  it("ignores a render that lands on the screen already showing", () => {
    const trail = createTrail(cold);
    trail.noteLocation("/");
    trail.noteLocation("/register");
    trail.noteLocation("/register");
    trail.noteLocation("/");

    expect(trail.canUnwind()).toBe(false);
  });

  it("tells a query apart from the path it hangs on", () => {
    const trail = createTrail(cold);
    trail.noteLocation("/quiz");
    trail.noteLocation("/quiz?competition=c1");

    expect(trail.canUnwind()).toBe(true);
  });

  it("has something to unwind when the document was opened from another screen of the app", () => {
    const trail = createTrail(() => true);
    trail.noteLocation("/quiz");

    expect(trail.canUnwind()).toBe(true);
  });
});
