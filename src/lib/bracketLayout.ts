export const CARD_HEIGHT = 64;
export const CARD_GAP = 16;
export const COLUMN_WIDTH = 170;
export const COLUMN_GAP = 32;

const UNIT = CARD_HEIGHT + CARD_GAP;

export function bracketTops(roundSizes: number[]): number[][] {
  const tops: number[][] = [];
  for (const [round, size] of roundSizes.entries()) {
    const feeders = tops[round - 1];
    tops.push(
      Array.from({ length: size }, (_, index) => {
        const first = feeders?.[index * 2];
        if (first === undefined) return index * UNIT;
        const second = feeders[index * 2 + 1] ?? first;
        return (first + second) / 2;
      }),
    );
  }
  return tops;
}

export function bracketHeight(tops: number[][]): number {
  const lasts = tops.map((round) => round[round.length - 1]).filter((top) => top !== undefined);
  return lasts.length === 0 ? 0 : Math.max(...lasts) + CARD_HEIGHT;
}

export function connectorPaths(feederTops: number[], tops: number[], width: number): string[] {
  const middle = width / 2;
  const center = (top: number) => top + CARD_HEIGHT / 2;

  return tops.flatMap((top, index) => {
    const first = feederTops[index * 2];
    if (first === undefined) return [];
    const second = feederTops[index * 2 + 1];
    if (second === undefined) return [`M0 ${center(first)}H${width}`];
    return [`M0 ${center(first)}H${middle}V${center(second)}H0M${middle} ${center(top)}H${width}`];
  });
}
