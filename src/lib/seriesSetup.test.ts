import { describe, it, expect } from "vitest";
import { seriesSetupProblem, type SeriesSetup } from "./seriesSetup";

const chess: SeriesSetup = {
  partsPerMatch: 2,
  matchEnding: "PLAY_ALL",
  partsToWin: null,
  partDecision: "OUTCOME",
  partTarget: null,
  partWord: "لعبة",
  partsWord: "ألعاب",
};

const maryass: SeriesSetup = {
  partsPerMatch: 3,
  matchEnding: "FIRST_TO",
  partsToWin: 2,
  partDecision: "POINTS",
  partTarget: 100,
  partWord: "جولة",
  partsWord: "جولات",
};

describe("what a series tournament may be set up as", () => {
  it("takes a match played out in full and decided by outcome", () => {
    expect(seriesSetupProblem(chess)).toBeNull();
  });

  it("takes a match that stops when one side has enough", () => {
    expect(seriesSetupProblem(maryass)).toBeNull();
  });

  it("takes a free score with no target", () => {
    expect(seriesSetupProblem({ ...chess, partsPerMatch: 1, partDecision: "SCORE" })).toBeNull();
  });

  it("wants a whole positive number of parts", () => {
    expect(seriesSetupProblem({ ...chess, partsPerMatch: 0 })).toBe("partsPerMatch");
    expect(seriesSetupProblem({ ...chess, partsPerMatch: null })).toBe("partsPerMatch");
    expect(seriesSetupProblem({ ...chess, partsPerMatch: 2.5 })).toBe("partsPerMatch");
  });

  it("wants the game's own word for one part", () => {
    expect(seriesSetupProblem({ ...chess, partWord: " " })).toBe("partWords");
    expect(seriesSetupProblem({ ...chess, partsWord: null })).toBe("partWords");
  });

  it("refuses a points target on a part decided by outcome", () => {
    expect(seriesSetupProblem({ ...chess, partTarget: 100 })).toBe("targetOnAnOutcome");
  });

  it("refuses a points target on a free score", () => {
    expect(seriesSetupProblem({ ...chess, partDecision: "SCORE", partTarget: 21 })).toBe(
      "targetOnAFreeScore",
    );
  });

  it("wants a target where the parts are played to one", () => {
    expect(seriesSetupProblem({ ...maryass, partTarget: null })).toBe("targetMissing");
  });

  it("refuses a number of parts to win where every part is played", () => {
    expect(seriesSetupProblem({ ...chess, partsToWin: 2 })).toBe("partsToWinUnused");
  });

  it("wants a number of parts to win where the match stops early", () => {
    expect(seriesSetupProblem({ ...maryass, partsToWin: null })).toBe("partsToWinMissing");
  });

  it("refuses a number of parts to win that the match cannot reach", () => {
    expect(seriesSetupProblem({ ...maryass, partsToWin: 4 })).toBe("partsToWinUnreachable");
  });
});
