import { describe, it, expect } from "vitest";
import { blankDraft, ladderOfDrafts, levelOfDraft, movedDraft, draftOfLevel } from "./levelDraft";
import { ladderProblem } from "@/lib/seriesSetup";

function chess() {
  const match = {
    ...blankDraft("a"),
    singular: "المباراة",
    plural: "المباريات",
    ending: "PLAY_ALL" as const,
    unitsPerParent: "2",
  };
  const game = {
    ...blankDraft("b"),
    singular: "لعبة",
    plural: "ألعاب",
    decision: "OUTCOME" as const,
  };
  return [match, game];
}

describe("a level drafted on the setup card", () => {
  it("leaves the match itself without a way of being recorded", () => {
    const level = levelOfDraft(chess()[0], 0, 2);

    expect(level.decision).toBeNull();
  });

  it("leaves the last level without an ending", () => {
    const level = levelOfDraft(chess()[1], 1, 2);

    expect(level.ending).toBeNull();
    expect(level.unitsPerParent).toBeNull();
  });

  it("drops a count of units where the level ends past a total", () => {
    const draft = { ...chess()[0], ending: "FIRST_PAST" as const, target: "100", unitsToWin: "12" };

    const level = levelOfDraft(draft, 0, 2);

    expect(level.unitsToWin).toBeNull();
    expect(level.target).toBe(100);
  });

  it("drops a total where the level ends on a count of units", () => {
    const draft = { ...chess()[0], ending: "FIRST_TO" as const, target: "100", unitsToWin: "2" };

    const level = levelOfDraft(draft, 0, 2);

    expect(level.target).toBeNull();
    expect(level.unitsToWin).toBe(2);
  });

  it("drops a decider target where the level plays all of its units", () => {
    const draft = { ...chess()[0], ending: "PLAY_ALL" as const, deciderTarget: "24" };

    expect(levelOfDraft(draft, 0, 2).deciderTarget).toBeNull();
  });

  it("passes the ladder check a chess tournament would draw", () => {
    expect(ladderProblem(ladderOfDrafts(chess()))).toBeNull();
  });

  it("comes back the way it went in", () => {
    const level = levelOfDraft(chess()[1], 1, 2);

    expect(draftOfLevel(level).singular).toBe("لعبة");
    expect(draftOfLevel(level).decision).toBe("OUTCOME");
  });
});

describe("reordering the levels", () => {
  it("moves one up without losing the rest", () => {
    const drafts = chess();

    expect(movedDraft(drafts, 1, 0).map((draft) => draft.key)).toEqual(["b", "a"]);
  });

  it("refuses to move one off either end", () => {
    const drafts = chess();

    expect(movedDraft(drafts, 0, -1)).toBe(drafts);
    expect(movedDraft(drafts, 1, 2)).toBe(drafts);
  });
});
