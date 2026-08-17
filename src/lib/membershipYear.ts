export const FIRST_MEMBERSHIP_YEAR = 2020;

export function runningYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

export function yearBounds(now?: Date): { min: number; max: number } {
  return { min: FIRST_MEMBERSHIP_YEAR, max: runningYear(now) + 1 };
}

export function isMembershipYear(value: unknown, now?: Date): value is number {
  if (!Number.isInteger(value)) return false;
  const { min, max } = yearBounds(now);
  return (value as number) >= min && (value as number) <= max;
}

export function resolveMembershipYear(stored: number | null | undefined, now?: Date): number {
  return isMembershipYear(stored, now) ? stored : runningYear(now);
}

export function membershipYears(current: number): number[] {
  const years: number[] = [];
  for (let year = current; year >= FIRST_MEMBERSHIP_YEAR; year--) years.push(year);
  return years;
}
