// A member who forgets their password calls an admin, who issues a temporary
// one. `User.tempPasswordExpiresAt` is the whole state: null means an ordinary
// password, a future date means the current one is temporary and the app stays
// locked until it is replaced, a past date means it no longer works at all.
//
// One nullable column rather than a flag plus a date, because a flag cannot
// expire and the pair could disagree.
export function isTempPasswordActive(
  expiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  return expiresAt != null && expiresAt > now;
}

export function isTempPasswordExpired(
  expiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  return expiresAt != null && expiresAt <= now;
}

export function tempPasswordExpiry(hours: number, now = new Date()): Date {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}
