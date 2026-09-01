import { toClubWallClock } from "./clubTime";

export const QUIET_FROM_HOUR = 22;
export const QUIET_UNTIL_HOUR = 7;

export function isQuietHour(at: Date): boolean {
  const hour = toClubWallClock(at).getUTCHours();
  return hour >= QUIET_FROM_HOUR || hour < QUIET_UNTIL_HOUR;
}
