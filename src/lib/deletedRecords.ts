export const RETENTION_DAYS = 30;

export type DeletableKind = "Member" | "Activity" | "User";

export function retentionExpiry(now: Date, days = RETENTION_DAYS): Date {
  const expires = new Date(now);
  expires.setDate(expires.getDate() + days);
  return expires;
}

export function daysLeft(expiresAt: Date, now: Date): number {
  const ms = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function confirmationMatches(typed: string, expected: string): boolean {
  return typed.trim().replace(/\s+/g, " ") === expected.trim().replace(/\s+/g, " ");
}
