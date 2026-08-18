export const SNOOZE_KEY = "ajvt_install_snoozed_until";
export const SESSION_KEY = "ajvt_install_seen";
export const INSTALLED_KEY = "ajvt_install_done";
export const SNOOZE_DAYS = 14;

export function snoozeUntil(now: Date, days = SNOOZE_DAYS): number {
  return now.getTime() + days * 24 * 60 * 60 * 1000;
}

export function snoozeActive(stored: string | null, now: Date): boolean {
  if (!stored) return false;
  const until = Number(stored);
  return Number.isFinite(until) && until > now.getTime();
}

export function alreadyInstalled(stored: string | null): boolean {
  return stored === "1";
}

export function shouldOffer({
  snoozedUntil,
  seenThisSession,
  installed,
  now,
}: {
  snoozedUntil: string | null;
  seenThisSession: boolean;
  installed: boolean;
  now: Date;
}): boolean {
  if (installed) return false;
  if (seenThisSession) return false;
  return !snoozeActive(snoozedUntil, now);
}
