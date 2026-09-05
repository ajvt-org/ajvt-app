import { describe, it, expect } from "vitest";
import { matchStanding } from "./activityMatches";

const scheduled = (bracketRound: number | null) => ({
  bracketRound,
  status: "SCHEDULED",
  forfeitWinnerTeamId: null,
});
const played = (bracketRound: number | null) => ({
  bracketRound,
  status: "PLAYED",
  forfeitWinnerTeamId: null,
});
const forfeited = (bracketRound: number | null) => ({
  bracketRound,
  status: "SCHEDULED",
  forfeitWinnerTeamId: "t1",
});

describe("matchStanding", () => {
  it("counts what is still to play and names the stage", () => {
    expect(matchStanding([played(1), played(1), scheduled(2), scheduled(2)], true)).toEqual({
      unplayedMatches: 2,
      awaitingStage: { kind: "knockout", roundSize: 2 },
    });
  });

  it("treats a forfeited match as played", () => {
    expect(matchStanding([forfeited(1), scheduled(2)], true)).toEqual({
      unplayedMatches: 1,
      awaitingStage: { kind: "knockout", roundSize: 1 },
    });
  });

  it("leaves an activity that is not a tournament with its count alone", () => {
    expect(matchStanding([scheduled(null), scheduled(null)], false)).toEqual({
      unplayedMatches: 2,
      awaitingStage: null,
    });
  });
});
