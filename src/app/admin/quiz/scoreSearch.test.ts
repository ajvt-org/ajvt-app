import { describe, it, expect } from "vitest";
import { matchingAttempts } from "./scoreSearch";
import type { AttemptRow } from "./scoreTypes";

const row = (name: string): AttemptRow => ({
  attemptId: name,
  userId: name,
  name,
  score: 10,
  voided: false,
  finishedAt: null,
});

const ROWS = [row("أحمد ولد محمد"), row("احمد ولد سالم"), row("عائشة بنت المختار")];

describe("finding a participant in the scores", () => {
  it("hands back everybody while nothing is typed", () => {
    expect(matchingAttempts(ROWS, "")).toHaveLength(3);
    expect(matchingAttempts(ROWS, "   ")).toHaveLength(3);
  });

  it("finds a name written with a different alef", () => {
    expect(matchingAttempts(ROWS, "احمد").map((r) => r.name)).toEqual([
      "أحمد ولد محمد",
      "احمد ولد سالم",
    ]);
    expect(matchingAttempts(ROWS, "أحمد")).toHaveLength(2);
  });

  it("takes the words in any order", () => {
    expect(matchingAttempts(ROWS, "سالم احمد").map((r) => r.name)).toEqual(["احمد ولد سالم"]);
  });

  it("hands back nothing when no name carries the words", () => {
    expect(matchingAttempts(ROWS, "خديجة")).toEqual([]);
  });
});
