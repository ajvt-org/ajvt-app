import { describe, it, expect } from "vitest";
import { FORFEIT_AWARD, countsForScorers, forfeitLoserTeamId, forfeitScore } from "@/lib/forfeit";

const HOME = "home-team";
const AWAY = "away-team";

describe("the score a forfeit awards", () => {
  it("lifts a winner who scored less than three up to three", () => {
    expect(forfeitScore({ home: 0, away: 0 }, HOME, HOME)).toEqual({ home: 3, away: 0 });
    expect(forfeitScore({ home: 1, away: 4 }, HOME, HOME)).toEqual({ home: 3, away: 0 });
    expect(forfeitScore({ home: 2, away: 0 }, HOME, HOME)).toEqual({ home: 3, away: 0 });
  });

  it("leaves a winner who already scored three or more alone", () => {
    expect(forfeitScore({ home: 3, away: 1 }, HOME, HOME)).toEqual({ home: 3, away: 0 });
    expect(forfeitScore({ home: 5, away: 2 }, HOME, HOME)).toEqual({ home: 5, away: 0 });
  });

  it("takes every goal off the loser, however many they scored", () => {
    expect(forfeitScore({ home: 0, away: 7 }, HOME, HOME).away).toBe(0);
    expect(forfeitScore({ home: 7, away: 0 }, AWAY, HOME).home).toBe(0);
  });

  it("works the same way when the away side is the winner", () => {
    expect(forfeitScore({ home: 4, away: 1 }, AWAY, HOME)).toEqual({ home: 0, away: 3 });
    expect(forfeitScore({ home: 0, away: 6 }, AWAY, HOME)).toEqual({ home: 0, away: 6 });
  });

  it("awards three, which is the number the association settled on", () => {
    expect(FORFEIT_AWARD).toBe(3);
  });
});

describe("which side lost the forfeit", () => {
  it("is the other team, whichever side won", () => {
    expect(forfeitLoserTeamId(HOME, HOME, AWAY)).toBe(AWAY);
    expect(forfeitLoserTeamId(AWAY, HOME, AWAY)).toBe(HOME);
  });
});

describe("whose goals still count towards the scorers table", () => {
  it("counts everyone when the match was played out", () => {
    expect(countsForScorers({ teamId: HOME }, null)).toBe(true);
    expect(countsForScorers({ teamId: AWAY }, null)).toBe(true);
    expect(countsForScorers({ teamId: AWAY }, undefined)).toBe(true);
  });

  it("keeps the winner's scorers on the table", () => {
    expect(countsForScorers({ teamId: HOME }, HOME)).toBe(true);
  });

  it("strikes the loser's scorers off it", () => {
    expect(countsForScorers({ teamId: AWAY }, HOME)).toBe(false);
    expect(countsForScorers({ teamId: HOME }, AWAY)).toBe(false);
  });
});
