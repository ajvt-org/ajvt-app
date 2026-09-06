import type { PartColour } from "@prisma/client";
import { HALVES_PER_PART } from "./matchSeries";

export const OTHER_COLOUR: Record<PartColour, PartColour> = {
  FIRST: "SECOND",
  SECOND: "FIRST",
};

export function colourOfPart(opensAs: PartColour, order: number): PartColour {
  return order % HALVES_PER_PART === 1 ? opensAs : OTHER_COLOUR[opensAs];
}

export interface ColouredPart {
  order: number;
  sideAColour: PartColour | null;
}

export function colourTally(parts: ColouredPart[]): { sideA: number; sideB: number } {
  let sideA = 0;
  let sideB = 0;
  for (const part of parts) {
    if (part.sideAColour === "FIRST") sideA += 1;
    if (part.sideAColour === "SECOND") sideB += 1;
  }
  return { sideA, sideB };
}

export function coloursBalanced(parts: ColouredPart[]): boolean {
  const tally = colourTally(parts);
  return tally.sideA === tally.sideB;
}

export function canBalance(partsPerMatch: number): boolean {
  return partsPerMatch % HALVES_PER_PART === 0;
}

export function evenlyDrawnOpeners<T>(
  matches: { sideA: T; sideB: T }[],
  held: Map<T, number> = new Map(),
): PartColour[] {
  const running = new Map(held);
  const owed = (side: T) => running.get(side) ?? 0;
  const bump = (side: T, by: number) => running.set(side, owed(side) + by);

  return matches.map((match) => {
    const opensAs: PartColour = owed(match.sideA) <= owed(match.sideB) ? "FIRST" : "SECOND";
    if (opensAs === "FIRST") {
      bump(match.sideA, 1);
      bump(match.sideB, -1);
    } else {
      bump(match.sideA, -1);
      bump(match.sideB, 1);
    }
    return opensAs;
  });
}
