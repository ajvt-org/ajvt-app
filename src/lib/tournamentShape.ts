export const MIN_TEAMS = 2;
export const MIN_GROUPS = 2;
export const MIN_GROUP_SIZE = 2;

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

export function knockoutIsPossible(teamCount: number): boolean {
  return teamCount >= MIN_TEAMS;
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
