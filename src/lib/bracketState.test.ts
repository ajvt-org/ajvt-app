import { describe, it, expect } from "vitest";
import { bracketUntouched, firstRoundIsWaiting } from "./bracketState";

const fixture = (over: Partial<Parameters<typeof firstRoundIsWaiting>[0][number]> = {}) => ({
  bracketRound: 1,
  homeTeam: null,
  awayTeam: null,
  status: "SCHEDULED",
  ...over,
});

describe("bracketUntouched", () => {
  it("is false when there is no bracket", () => {
    expect(bracketUntouched([])).toBe(false);
  });

  it("is true while every fixture is still to be played", () => {
    expect(bracketUntouched([fixture(), fixture({ bracketRound: 2 })])).toBe(true);
  });

  it("is false once a fixture carries a result", () => {
    expect(bracketUntouched([fixture({ status: "PLAYED" }), fixture()])).toBe(false);
  });
});

describe("firstRoundIsWaiting", () => {
  it("is true when the first round is drawn with no teams in it", () => {
    expect(firstRoundIsWaiting([fixture(), fixture(), fixture({ bracketRound: 2 })])).toBe(true);
  });

  it("is false once a team has been put into the first round", () => {
    expect(firstRoundIsWaiting([fixture({ homeTeam: { id: "t1" } }), fixture()])).toBe(false);
  });

  it("is false when a later round is waiting but the first one is filled", () => {
    expect(
      firstRoundIsWaiting([
        fixture({ homeTeam: { id: "t1" }, awayTeam: { id: "t2" } }),
        fixture({ bracketRound: 2 }),
      ]),
    ).toBe(false);
  });

  it("is false when the bracket has started, whatever the first round holds", () => {
    expect(firstRoundIsWaiting([fixture({ status: "PLAYED" }), fixture()])).toBe(false);
  });

  it("is false when there is no bracket at all", () => {
    expect(firstRoundIsWaiting([])).toBe(false);
  });

  it("is false when the bracket starts at a round that is not the first", () => {
    expect(firstRoundIsWaiting([fixture({ bracketRound: 2 })])).toBe(false);
  });
});
