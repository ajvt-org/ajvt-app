import { isPowerOfTwo } from "./tournament";

export const MIN_TEAMS = 2;
export const MIN_GROUPS = 2;
export const MIN_GROUP_SIZE = 2;

export type ShapeRefusal =
  | { kind: "tooFewTeams"; teamCount: number }
  | { kind: "notABracket"; teamCount: number; below: number | null; above: number }
  | { kind: "noGroupSplit"; teamCount: number };

export interface GroupShape {
  groupCount: number;
  groupSize: number;
  qualifierCounts: number[];
}

function powersOfTwoBelow(n: number): number[] {
  const out: number[] = [];
  for (let p = MIN_TEAMS; p < n; p *= 2) out.push(p);
  return out;
}

export function nearestBracketSizes(teamCount: number): { below: number | null; above: number } {
  const smaller = powersOfTwoBelow(teamCount);
  const below = smaller.at(-1) ?? null;
  return { below, above: (below ?? 1) * 2 };
}

export function knockoutRefusal(teamCount: number): ShapeRefusal | null {
  if (teamCount < MIN_TEAMS) return { kind: "tooFewTeams", teamCount };
  if (isPowerOfTwo(teamCount)) return null;
  return { kind: "notABracket", teamCount, ...nearestBracketSizes(teamCount) };
}

export function qualifierCountsFor(teamCount: number, groupCount: number): number[] {
  return powersOfTwoBelow(teamCount).filter((q) => q % groupCount === 0);
}

export function groupShapes(teamCount: number): GroupShape[] {
  if (teamCount < MIN_TEAMS) return [];
  const shapes: GroupShape[] = [];
  for (let groupCount = MIN_GROUPS; groupCount <= teamCount / MIN_GROUP_SIZE; groupCount++) {
    if (teamCount % groupCount !== 0) continue;
    const qualifierCounts = qualifierCountsFor(teamCount, groupCount);
    if (qualifierCounts.length === 0) continue;
    shapes.push({ groupCount, groupSize: teamCount / groupCount, qualifierCounts });
  }
  return shapes;
}

export function groupsRefusal(teamCount: number): ShapeRefusal | null {
  if (teamCount < MIN_TEAMS) return { kind: "tooFewTeams", teamCount };
  if (groupShapes(teamCount).length === 0) return { kind: "noGroupSplit", teamCount };
  return null;
}

export function isValidGroupShape(
  teamCount: number,
  groupCount: number,
  qualifierCount: number,
): boolean {
  const shape = groupShapes(teamCount).find((s) => s.groupCount === groupCount);
  return shape !== undefined && shape.qualifierCounts.includes(qualifierCount);
}

export function qualifiersPerGroup(groupCount: number, qualifierCount: number): number {
  return qualifierCount / groupCount;
}
