import { describe, it, expect } from "vitest";
import {
  canBalance,
  colourOfPart,
  colourTally,
  coloursBalanced,
  evenlyDrawnOpeners,
} from "./seriesColours";

function alternated(opensAs: "FIRST" | "SECOND", count: number) {
  return Array.from({ length: count }, (_, i) => ({
    order: i + 1,
    sideAColour: colourOfPart(opensAs, i + 1),
  }));
}

describe("colourOfPart", () => {
  it("gives the first part the colour the draw set", () => {
    expect(colourOfPart("FIRST", 1)).toBe("FIRST");
    expect(colourOfPart("SECOND", 1)).toBe("SECOND");
  });

  it("turns the colours over on every part after it", () => {
    expect(colourOfPart("FIRST", 2)).toBe("SECOND");
    expect(colourOfPart("FIRST", 3)).toBe("FIRST");
    expect(colourOfPart("FIRST", 4)).toBe("SECOND");
  });
});

describe("coloursBalanced", () => {
  it("comes out level over an even number of parts", () => {
    expect(coloursBalanced(alternated("FIRST", 2))).toBe(true);
    expect(coloursBalanced(alternated("SECOND", 4))).toBe(true);
  });

  it("cannot come out level over an odd number of parts", () => {
    expect(coloursBalanced(alternated("FIRST", 1))).toBe(false);
    expect(coloursBalanced(alternated("FIRST", 3))).toBe(false);
  });

  it("counts which side opened how often", () => {
    expect(colourTally(alternated("FIRST", 4))).toEqual({ sideA: 2, sideB: 2 });
  });

  it("stays level when a match is extended by another pair", () => {
    expect(coloursBalanced(alternated("FIRST", 6))).toBe(true);
  });

  it("ignores a part whose colour was never set", () => {
    expect(coloursBalanced([{ order: 1, sideAColour: null }])).toBe(true);
  });
});

describe("canBalance", () => {
  it("says a match of one part cannot be balanced", () => {
    expect(canBalance(1)).toBe(false);
    expect(canBalance(3)).toBe(false);
  });

  it("says an even count can", () => {
    expect(canBalance(2)).toBe(true);
    expect(canBalance(4)).toBe(true);
  });
});

describe("evenlyDrawnOpeners", () => {
  it("gives the first colour to one side of a single match", () => {
    expect(evenlyDrawnOpeners([{ sideA: "a", sideB: "b" }])).toEqual(["FIRST"]);
  });

  it("spreads the first colour across a round rather than giving it to the same side", () => {
    const round = [
      { sideA: "a", sideB: "b" },
      { sideA: "a", sideB: "c" },
      { sideA: "a", sideB: "d" },
      { sideA: "a", sideB: "e" },
    ];

    const opens = evenlyDrawnOpeners(round);

    expect(opens.filter((c) => c === "FIRST")).toHaveLength(2);
    expect(opens.filter((c) => c === "SECOND")).toHaveLength(2);
  });

  it("takes what each side has already been given into account", () => {
    const held = new Map([["a", 2]]);

    expect(evenlyDrawnOpeners([{ sideA: "a", sideB: "b" }], held)).toEqual(["SECOND"]);
  });

  it("leaves a round of separate pairs balanced across the two sides", () => {
    const round = [
      { sideA: "a", sideB: "b" },
      { sideA: "c", sideB: "d" },
    ];

    expect(evenlyDrawnOpeners(round)).toEqual(["FIRST", "FIRST"]);
  });
});
