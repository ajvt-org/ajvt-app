import { describe, it, expect } from "vitest";
import { bracketRounds } from "./bracketRounds";

const label = (round: number) => `round ${round}`;

const match = (bracketRound: number, order: number, round: string | null = null) => ({
  bracketRound,
  order,
  round,
});

describe("grouping a bracket into its rounds", () => {
  it("puts the first round first however the fixtures arrive", () => {
    const rounds = bracketRounds([match(3, 1), match(1, 1), match(2, 1)], label);

    expect(rounds.map((r) => r.number)).toEqual([1, 2, 3]);
  });

  it("orders the fixtures inside a round by their own order", () => {
    const rounds = bracketRounds([match(1, 3), match(1, 1), match(1, 2)], label);

    expect(rounds[0].matches.map((m) => m.order)).toEqual([1, 2, 3]);
  });

  it("takes the name a fixture gives its round", () => {
    const rounds = bracketRounds([match(1, 1, "نصف النهائي")], label);

    expect(rounds[0].label).toBe("نصف النهائي");
  });

  it("falls back to a numbered name when no fixture names the round", () => {
    const rounds = bracketRounds([match(2, 1)], label);

    expect(rounds[0].label).toBe("round 2");
  });

  it("falls back when a fixture names its round with nothing", () => {
    const rounds = bracketRounds([match(2, 1, "")], label);

    expect(rounds[0].label).toBe("round 2");
  });

  it("has no rounds when there are no fixtures", () => {
    expect(bracketRounds([], label)).toEqual([]);
  });
});
