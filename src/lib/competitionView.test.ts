import { describe, it, expect } from "vitest";
import { competitionRows, type CompetitionRowInput } from "./competitionView";

const START = new Date("2026-08-01T00:00:00.000Z");
const DAY = 1440 * 60_000;

function row(over: Partial<CompetitionRowInput["competition"]> = {}, scores: number[] = []) {
  return {
    competition: {
      id: "c1",
      name: "مسابقة",
      visibility: "PUBLIC",
      startsAt: START,
      startedAt: START,
      roundCount: 5,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      ...over,
    },
    mine: scores.map((score) => ({ score })),
  };
}

describe("competitionRows", () => {
  it("keeps a competition that has not started at before", () => {
    const [view] = competitionRows([row({ startedAt: null })], new Date(START.getTime() + DAY));

    expect(view.state).toBe("before");
    expect(view.passedRounds).toBe(0);
  });

  it("counts the rounds a running competition has reached", () => {
    const [view] = competitionRows([row()], new Date(START.getTime() + 2 * DAY));

    expect(view.passedRounds).toBe(3);
  });

  it("adds up what the caller scored", () => {
    const [view] = competitionRows([row({}, [10, 25])], new Date(START.getTime() + DAY));

    expect(view.myScore).toBe(35);
  });

  it("scores nothing for a caller with no attempts", () => {
    const [view] = competitionRows([row()], new Date(START.getTime() + DAY));

    expect(view.myScore).toBe(0);
  });
});
