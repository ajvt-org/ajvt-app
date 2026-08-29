import { describe, it, expect } from "vitest";
import {
  extraTimeAllowed,
  hasExtraTime,
  kicksAllowed,
  kicksAlternate,
  level,
  nextKickTeamId,
  playedScore,
  regularScore,
} from "./matchScores";

const HOME = "t1";
const AWAY = "t2";

const goal = (teamId: string, period: "REGULAR" | "EXTRA_TIME" = "REGULAR") => ({
  teamId,
  period,
});

describe("regularScore", () => {
  it("leaves the extra time goals out", () => {
    const goals = [goal(HOME), goal(AWAY), goal(HOME, "EXTRA_TIME")];

    expect(regularScore(goals, HOME)).toEqual({ home: 1, away: 1 });
  });

  it("is nothing to nothing without goals", () => {
    expect(regularScore([], HOME)).toEqual({ home: 0, away: 0 });
  });
});

describe("playedScore", () => {
  it("counts what the extra time added", () => {
    const goals = [goal(HOME), goal(AWAY), goal(HOME, "EXTRA_TIME")];

    expect(playedScore(goals, HOME)).toEqual({ home: 2, away: 1 });
  });
});

describe("extraTimeAllowed", () => {
  it("turns a knockout level after ninety minutes down to yes", () => {
    expect(extraTimeAllowed(true, [goal(HOME), goal(AWAY)], HOME)).toBe(true);
  });

  it("stays yes once an extra time goal breaks the tie, so the section holds", () => {
    const goals = [goal(HOME), goal(AWAY), goal(HOME, "EXTRA_TIME")];

    expect(extraTimeAllowed(true, goals, HOME)).toBe(true);
  });

  it("refuses a group-stage match however level it is", () => {
    expect(extraTimeAllowed(false, [goal(HOME), goal(AWAY)], HOME)).toBe(false);
  });

  it("refuses a knockout decided inside ninety minutes", () => {
    expect(extraTimeAllowed(true, [goal(HOME)], HOME)).toBe(false);
  });

  it("allows a goalless knockout", () => {
    expect(extraTimeAllowed(true, [], HOME)).toBe(true);
  });
});

describe("kicksAllowed", () => {
  it("reads the score after extra time, not before it", () => {
    const decided = [goal(HOME), goal(AWAY), goal(HOME, "EXTRA_TIME")];

    expect(kicksAllowed(true, decided, HOME)).toBe(false);
  });

  it("allows a knockout still level after extra time", () => {
    const stillLevel = [goal(HOME), goal(AWAY), goal(HOME, "EXTRA_TIME"), goal(AWAY, "EXTRA_TIME")];

    expect(kicksAllowed(true, stillLevel, HOME)).toBe(true);
  });

  it("refuses a group-stage match", () => {
    expect(kicksAllowed(false, [], HOME)).toBe(false);
  });
});

describe("hasExtraTime", () => {
  it("spots a single extra time goal", () => {
    expect(hasExtraTime([goal(HOME), goal(AWAY, "EXTRA_TIME")])).toBe(true);
  });

  it("is false over regular goals alone", () => {
    expect(hasExtraTime([goal(HOME)])).toBe(false);
  });
});

describe("level", () => {
  it("knows a draw from a win", () => {
    expect(level({ home: 2, away: 2 })).toBe(true);
    expect(level({ home: 2, away: 1 })).toBe(false);
  });
});

describe("kicksAlternate", () => {
  it("accepts a shootout that changes side every kick", () => {
    const kicks = [HOME, AWAY, HOME, AWAY, HOME].map((teamId) => ({ teamId }));

    expect(kicksAlternate(kicks)).toBe(true);
  });

  it("accepts sudden death, which alternates the same way", () => {
    const kicks = [HOME, AWAY, HOME, AWAY, HOME, AWAY, HOME, AWAY, HOME, AWAY, HOME, AWAY].map(
      (teamId) => ({ teamId }),
    );

    expect(kicksAlternate(kicks)).toBe(true);
  });

  it("refuses two kicks in a row from one side", () => {
    const kicks = [HOME, AWAY, AWAY].map((teamId) => ({ teamId }));

    expect(kicksAlternate(kicks)).toBe(false);
  });

  it("accepts an empty shootout and a single kick", () => {
    expect(kicksAlternate([])).toBe(true);
    expect(kicksAlternate([{ teamId: HOME }])).toBe(true);
  });
});

describe("nextKickTeamId", () => {
  it("gives the first kick to whoever was picked", () => {
    expect(nextKickTeamId([], AWAY, HOME, AWAY)).toBe(AWAY);
  });

  it("hands the turn to the other side after each kick", () => {
    expect(nextKickTeamId([{ teamId: HOME }], HOME, HOME, AWAY)).toBe(AWAY);
    expect(nextKickTeamId([{ teamId: HOME }, { teamId: AWAY }], HOME, HOME, AWAY)).toBe(HOME);
  });
});
