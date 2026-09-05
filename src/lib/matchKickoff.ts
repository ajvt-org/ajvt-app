export function kickoffPassed(matchDate: string | Date | null | undefined, now: Date): boolean {
  if (!matchDate) return true;
  return new Date(matchDate).getTime() <= now.getTime();
}

export function resultEntryAllowed(
  played: boolean,
  matchDate: string | Date | null | undefined,
  now: Date,
): boolean {
  return played || kickoffPassed(matchDate, now);
}
