import { describe, it, expect } from "vitest";
import { CARD_GAP, CARD_HEIGHT, bracketHeight, bracketTops, connectorPaths } from "./bracketLayout";

const center = (top: number) => top + CARD_HEIGHT / 2;

describe("bracketTops", () => {
  it("leaves a full gap between the cards of the first round", () => {
    const [first] = bracketTops([4]);

    expect(first).toEqual([0, 80, 160, 240]);
    expect(first[1] - (first[0] + CARD_HEIGHT)).toBe(CARD_GAP);
  });

  it("puts a card at the midpoint of the two that feed it", () => {
    const [first, second] = bracketTops([4, 2]);

    expect(center(second[0])).toBe((center(first[0]) + center(first[1])) / 2);
    expect(center(second[1])).toBe((center(first[2]) + center(first[3])) / 2);
  });

  it("keeps the final centred on the whole bracket of eight", () => {
    const rounds = bracketTops([8, 4, 2, 1]);
    const first = rounds[0];
    const final = rounds[3];

    expect(center(final[0])).toBe((center(first[0]) + center(first[7])) / 2);
  });

  it("centres the final over two semi finals", () => {
    const [semis, final] = bracketTops([2, 1]);

    expect(semis).toEqual([0, 80]);
    expect(center(final[0])).toBe((center(semis[0]) + center(semis[1])) / 2);
  });

  it("carries a card straight across when only one fixture feeds it", () => {
    const [first, second] = bracketTops([1, 1]);

    expect(second[0]).toBe(first[0]);
  });

  it("falls back to stacking when a round is wider than the one before it", () => {
    const [, second] = bracketTops([1, 3]);

    expect(second).toEqual([0, 80, 160]);
  });
});

describe("bracketHeight", () => {
  it("spans the tallest column with no room left under the last card", () => {
    expect(bracketHeight(bracketTops([4, 2, 1]))).toBe(4 * CARD_HEIGHT + 3 * CARD_GAP);
  });

  it("is a single card tall for a bracket of one fixture", () => {
    expect(bracketHeight(bracketTops([1]))).toBe(CARD_HEIGHT);
  });

  it("is nothing at all when there are no rounds", () => {
    expect(bracketHeight([])).toBe(0);
  });
});

describe("connectorPaths", () => {
  it("draws one path per fixture that has feeders", () => {
    const [first, second] = bracketTops([4, 2]);

    expect(connectorPaths(first, second, 32)).toHaveLength(2);
  });

  it("joins both feeders in the gutter and carries on to the fixture", () => {
    const [first, second] = bracketTops([2, 1]);

    expect(connectorPaths(first, second, 32)).toEqual(["M0 32H16V112H0M16 72H32"]);
  });

  it("runs straight across when a fixture has a single feeder", () => {
    expect(connectorPaths([0], [0], 32)).toEqual(["M0 32H32"]);
  });

  it("draws nothing for the round that starts the bracket", () => {
    expect(connectorPaths([], bracketTops([4])[0], 32)).toEqual([]);
  });
});
