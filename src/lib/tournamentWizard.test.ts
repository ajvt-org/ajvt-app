import { describe, it, expect } from "vitest";
import {
  canLeave,
  drawIsValid,
  formatsFor,
  isLastStep,
  nextStep,
  previousStep,
  shapeIsChosen,
  stepsFor,
  wizardBlocker,
  type WizardState,
  type WizardTeam,
} from "./tournamentWizard";
import { dealIntoGroups } from "./tournamentDraw";

const teams = (n: number): WizardTeam[] =>
  Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `فريق ${i + 1}` }));

function state(over: Partial<WizardState> = {}): WizardState {
  return {
    format: null,
    groupCount: null,
    qualifierCount: null,
    groups: [],
    startsAt: "",
    times: [],
    ...over,
  };
}

describe("wizardBlocker", () => {
  it("lets a workable set of teams through", () => {
    expect(wizardBlocker(12, 0)).toBeNull();
    expect(wizardBlocker(8, 0)).toBeNull();
  });

  it("refuses once a match has been played", () => {
    expect(wizardBlocker(12, 3)).toEqual({ kind: "hasResults", played: 3 });
  });

  it("puts the played result ahead of every other reason", () => {
    expect(wizardBlocker(1, 2)).toEqual({ kind: "hasResults", played: 2 });
  });

  it("refuses fewer than two teams", () => {
    expect(wizardBlocker(1, 0)).toEqual({ kind: "tooFewTeams", teamCount: 1 });
  });

  it("refuses a count that fits neither a bracket nor a group stage", () => {
    const blocker = wizardBlocker(7, 0);

    expect(blocker?.kind).toBe("noShape");
  });
});

describe("formatsFor", () => {
  it("offers both shapes when the count allows both", () => {
    expect(formatsFor(8)).toEqual(["KNOCKOUT", "GROUPS_THEN_KNOCKOUT"]);
  });

  it("offers only a group stage for twelve teams", () => {
    expect(formatsFor(12)).toEqual(["GROUPS_THEN_KNOCKOUT"]);
  });

  it("offers nothing for a count that fits neither", () => {
    expect(formatsFor(7)).toEqual([]);
  });
});

describe("stepsFor", () => {
  it("skips the groups and the group schedule for a straight knockout", () => {
    expect(stepsFor("KNOCKOUT")).toEqual(["shape", "bracket", "dates"]);
  });

  it("walks every step for a group stage", () => {
    expect(stepsFor("GROUPS_THEN_KNOCKOUT")).toEqual([
      "shape",
      "groups",
      "schedule",
      "bracket",
      "dates",
    ]);
  });
});

describe("shapeIsChosen", () => {
  it("takes a knockout as soon as the format is picked", () => {
    expect(shapeIsChosen(state({ format: "KNOCKOUT" }), 8)).toBe(true);
  });

  it("refuses a knockout the count cannot fill", () => {
    expect(shapeIsChosen(state({ format: "KNOCKOUT" }), 12)).toBe(false);
  });

  it("waits for both the group count and the qualifier count", () => {
    expect(shapeIsChosen(state({ format: "GROUPS_THEN_KNOCKOUT", groupCount: 4 }), 12)).toBe(false);
    expect(
      shapeIsChosen(
        state({ format: "GROUPS_THEN_KNOCKOUT", groupCount: 4, qualifierCount: 8 }),
        12,
      ),
    ).toBe(true);
  });

  it("refuses a combination the rules do not allow", () => {
    expect(
      shapeIsChosen(
        state({ format: "GROUPS_THEN_KNOCKOUT", groupCount: 3, qualifierCount: 4 }),
        12,
      ),
    ).toBe(false);
  });
});

describe("drawIsValid", () => {
  it("accepts an even draw holding every team once", () => {
    const all = teams(12);
    const drawn = state({ groupCount: 4, groups: dealIntoGroups(all, 4) });

    expect(drawIsValid(drawn, all)).toBe(true);
  });

  it("refuses a draw with the wrong number of groups", () => {
    const all = teams(12);
    const drawn = state({ groupCount: 4, groups: dealIntoGroups(all, 2) });

    expect(drawIsValid(drawn, all)).toBe(false);
  });

  it("refuses a draw that has lost a team", () => {
    const all = teams(12);
    const groups = dealIntoGroups(all, 4);
    groups[0].teams = groups[0].teams.slice(1);

    expect(drawIsValid(state({ groupCount: 4, groups }), all)).toBe(false);
  });
});

describe("moving through the steps", () => {
  const all = teams(12);
  const chosen = state({ format: "GROUPS_THEN_KNOCKOUT", groupCount: 4, qualifierCount: 8 });

  it("holds at the shape until it is settled", () => {
    expect(nextStep("shape", state({ format: "GROUPS_THEN_KNOCKOUT" }), all)).toBeNull();
    expect(nextStep("shape", chosen, all)).toBe("groups");
  });

  it("holds at the groups until the draw is even", () => {
    expect(nextStep("groups", chosen, all)).toBeNull();
    expect(nextStep("groups", { ...chosen, groups: dealIntoGroups(all, 4) }, all)).toBe("schedule");
  });

  it("walks the previews without asking anything", () => {
    expect(canLeave("schedule", chosen, all)).toBe(true);
    expect(canLeave("bracket", chosen, all)).toBe(true);
  });

  it("holds at the dates until a first day and a time are given", () => {
    expect(canLeave("dates", chosen, all)).toBe(false);
    expect(canLeave("dates", { ...chosen, startsAt: "2026-09-20", times: ["16:00"] }, all)).toBe(
      true,
    );
  });

  it("goes back the way it came", () => {
    expect(previousStep("schedule", "GROUPS_THEN_KNOCKOUT")).toBe("groups");
    expect(previousStep("bracket", "KNOCKOUT")).toBe("shape");
    expect(previousStep("shape", "KNOCKOUT")).toBeNull();
  });

  it("knows when there is nothing left but to write it", () => {
    expect(isLastStep("dates", "KNOCKOUT")).toBe(true);
    expect(isLastStep("bracket", "GROUPS_THEN_KNOCKOUT")).toBe(false);
  });

  it("has nowhere to go after the last step", () => {
    const ready = { ...chosen, startsAt: "2026-09-20", times: ["16:00"] };

    expect(nextStep("dates", ready, all)).toBeNull();
  });
});
