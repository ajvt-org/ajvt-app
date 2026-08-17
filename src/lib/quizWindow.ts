export const DEFAULT_ANSWER_WINDOW_SECONDS = 10;

export const GRACE_MS = 1500;

export function deadline(revealedAt: Date, windowSeconds: number): Date {
  return new Date(revealedAt.getTime() + windowSeconds * 1000);
}

export function elapsedMs(revealedAt: Date, now: Date): number {
  return Math.max(0, now.getTime() - revealedAt.getTime());
}

export function remainingMs(revealedAt: Date, now: Date, windowSeconds: number): number {
  return Math.max(0, deadline(revealedAt, windowSeconds).getTime() - now.getTime());
}

export function windowExpired(revealedAt: Date, now: Date, windowSeconds: number): boolean {
  return now.getTime() > deadline(revealedAt, windowSeconds).getTime() + GRACE_MS;
}
