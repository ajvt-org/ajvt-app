export const DEFAULT_MIN_SHARE = 0.4;

export function timeScore({
  points,
  elapsedMs,
  windowSeconds,
  minShare = DEFAULT_MIN_SHARE,
}: {
  points: number;
  elapsedMs: number;
  windowSeconds: number;
  minShare?: number;
}): number {
  if (points <= 0) return 0;

  const windowMs = windowSeconds * 1000;
  if (windowMs <= 0) return points;

  const floor = Math.min(Math.max(minShare, 0), 1);
  const used = Math.min(Math.max(elapsedMs, 0), windowMs);
  const share = floor + (1 - floor) * (1 - used / windowMs);

  return Math.max(1, Math.round(points * share));
}
