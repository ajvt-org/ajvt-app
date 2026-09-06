export interface BracketSlot<T> {
  home: T;
  away: T | null;
}

export function bracketSize(entrantCount: number): number {
  let size = 1;
  while (size < entrantCount) size *= 2;
  return size;
}

export function byeCount(entrantCount: number): number {
  return bracketSize(entrantCount) - entrantCount;
}

function pairUnder<T extends { groupId?: string | null }>(
  remaining: T[],
  byesLeft: number,
): { pairs: [T, T][]; byes: T[] } | null {
  if (remaining.length === 0) return byesLeft === 0 ? { pairs: [], byes: [] } : null;
  const [first, ...rest] = remaining;

  if (byesLeft > 0) {
    const solved = pairUnder(rest, byesLeft - 1);
    if (solved) return { pairs: solved.pairs, byes: [first, ...solved.byes] };
  }

  for (let i = 0; i < rest.length; i++) {
    const partner = rest[i];
    if (first.groupId != null && partner.groupId === first.groupId) continue;
    const solved = pairUnder(
      rest.filter((_, j) => j !== i),
      byesLeft,
    );
    if (solved) return { pairs: [[first, partner], ...solved.pairs], byes: solved.byes };
  }
  return null;
}

function interleave<T>(pairs: [T, T][], byes: T[]): BracketSlot<T>[] {
  const slots: BracketSlot<T>[] = [];
  const longer = Math.max(pairs.length, byes.length);
  for (let i = 0; i < longer; i++) {
    const pair = pairs[i];
    if (pair) slots.push({ home: pair[0], away: pair[1] });
    const bye = byes[i];
    if (bye) slots.push({ home: bye, away: null });
  }
  return slots;
}

export function drawFirstRound<T extends { id: string; groupId?: string | null }>(
  entrants: T[],
): BracketSlot<T>[] | null {
  if (entrants.length < 2) return null;
  const solved = pairUnder(entrants, byeCount(entrants.length));
  return solved ? interleave(solved.pairs, solved.byes) : null;
}

export function isBye(match: { firstTeam: unknown; secondTeam: unknown; status: string }): boolean {
  return match.status === "PLAYED" && (match.firstTeam === null) !== (match.secondTeam === null);
}
