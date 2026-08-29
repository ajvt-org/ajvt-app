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
