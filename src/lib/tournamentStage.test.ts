import { describe, it, expect } from "vitest";
import { tournamentStage } from "./tournamentStage";

const match = (bracketRound: number | null, unplayed: boolean) => ({ bracketRound, unplayed });

describe("tournamentStage", () => {
  it("names no stage when everything has been played", () => {
    expect(tournamentStage([match(1, false), match(2, false)])).toBeNull();
  });

  it("names no stage when there are no matches", () => {
    expect(tournamentStage([])).toBeNull();
  });

  it("takes the lowest round still unplayed", () => {
    const stage = tournamentStage([
      match(1, false),
      match(1, false),
      match(2, true),
      match(2, true),
      match(3, true),
    ]);

    expect(stage).toEqual({ kind: "knockout", roundSize: 2 });
  });

  it("sizes a half played round from all of its matches", () => {
    const stage = tournamentStage([match(2, false), match(2, true), match(3, true)]);

    expect(stage).toEqual({ kind: "knockout", roundSize: 2 });
  });

  it("calls an outstanding group match a group stage", () => {
    expect(tournamentStage([match(null, true)])).toEqual({ kind: "group" });
  });

  it("waits on the group stage when a group match and a bracket match are both open", () => {
    expect(tournamentStage([match(null, true), match(1, true), match(1, true)])).toEqual({
      kind: "group",
    });
  });

  it("moves on to the bracket once the group matches are played", () => {
    const stage = tournamentStage([match(null, false), match(1, true), match(1, true)]);

    expect(stage).toEqual({ kind: "knockout", roundSize: 2 });
  });
});
