import { describe, it, expect } from "vitest";
import { blankDraft, ladderOfDrafts, levelOfDraft, movedDraft, draftOfLevel } from "./levelDraft";
import { ladderProblem } from "@/lib/seriesSetup";

function chess() {
  const match = {
    ...blankDraft("a"),
    singular: "المباراة",
    plural: "المباريات",
    countedBy: "OUTCOME" as const,
    endsBy: "COUNT" as const,
    unitCount: "2",
    unsettled: "DRAW" as const,
  };
  const game = { ...blankDraft("b"), singular: "لعبة", plural: "ألعاب" };
  return [match, game];
}

describe("a level drafted on the setup card", () => {
  it("leaves the last level without rules of its own", () => {
    const level = levelOfDraft(chess()[1], 1, 2);

    expect(level.countedBy).toBeNull();
    expect(level.endsBy).toBeNull();
    expect(level.unitCount).toBeNull();
  });

  it("drops a count of units where the level ends at a number", () => {
    const draft = { ...chess()[0], endsBy: "TARGET" as const, target: "100", unitCount: "12" };

    const level = levelOfDraft(draft, 0, 2);

    expect(level.unitCount).toBeNull();
    expect(level.target).toBe(100);
  });

  it("drops a number where the level ends on a count of units", () => {
    const draft = { ...chess()[0], endsBy: "COUNT" as const, target: "100", unitCount: "2" };

    const level = levelOfDraft(draft, 0, 2);

    expect(level.target).toBeNull();
    expect(level.unitCount).toBe(2);
  });

  it("drops the number of a deciding unit where the level ends on a count", () => {
    const draft = { ...chess()[0], deciderTarget: "24" };

    expect(levelOfDraft(draft, 0, 2).deciderTarget).toBeNull();
  });

  it("drops a margin where nothing is continued", () => {
    const draft = { ...chess()[0], margin: "1", continueUnits: "2" };

    const level = levelOfDraft(draft, 0, 2);

    expect(level.margin).toBeNull();
    expect(level.continueUnits).toBeNull();
  });

  it("keeps the margin and drops the units where the level is played to a target", () => {
    const draft = {
      ...chess()[0],
      endsBy: "TARGET" as const,
      target: "100",
      unsettled: "CONTINUE" as const,
      margin: "1",
      continueUnits: "2",
    };

    const level = levelOfDraft(draft, 0, 2);

    expect(level.margin).toBe(1);
    expect(level.continueUnits).toBeNull();
  });

  it("passes the ladder check a chess tournament would draw", () => {
    expect(ladderProblem(ladderOfDrafts(chess()))).toBeNull();
  });

  it("comes back the way it went in", () => {
    const level = levelOfDraft(chess()[0], 0, 2);

    expect(draftOfLevel(level).singular).toBe("المباراة");
    expect(draftOfLevel(level).countedBy).toBe("OUTCOME");
    expect(draftOfLevel(level).unitCount).toBe("2");
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
