export function willBeLinked(
  standingUserId: string | null,
  sentUserId: string | null | undefined,
): boolean {
  return sentUserId !== undefined ? sentUserId !== null : standingUserId !== null;
}
