import { describe, it, expect } from "vitest";
import { matchOutcome, type ScoredMatch } from "./matchOutcome";

const match = (over: Partial<ScoredMatch> = {}): ScoredMatch => ({
  status: "PLAYED",
  homeScore: 3,
  awayScore: 1,
  homePenalties: null,
  awayPenalties: null,
  forfeitWinnerTeamId: null,
  ...over,
});

describe("what a match on the schedule finished", () => {
  it("reads the score of a played match", () => {
    expect(matchOutcome(match())).toEqual({
      home: 3,
      away: 1,
      penalties: null,
      forfeit: false,
    });
  });

  it("has nothing to read on a match that has not been played", () => {
    expect(matchOutcome(match({ status: "SCHEDULED" }))).toBeNull();
  });

  it("has nothing to read on a played match whose score was never saved", () => {
    expect(matchOutcome(match({ homeScore: null, awayScore: null }))).toBeNull();
  });

  it("carries the shootout when one settled the match", () => {
    const outcome = matchOutcome(
      match({ homeScore: 2, awayScore: 2, homePenalties: 4, awayPenalties: 3 }),
    );

    expect(outcome?.penalties).toEqual({ home: 4, away: 3 });
  });

  it("keeps the awarded score of a walkover and marks it as one", () => {
    const outcome = matchOutcome(match({ homeScore: 3, awayScore: 0, forfeitWinnerTeamId: "t1" }));

    expect(outcome).toEqual({ home: 3, away: 0, penalties: null, forfeit: true });
  });

  it("drops a shootout recorded on a walkover, since nobody took it", () => {
    const outcome = matchOutcome(
      match({ homePenalties: 4, awayPenalties: 3, forfeitWinnerTeamId: "t1" }),
    );

    expect(outcome?.penalties).toBeNull();
  });
});
