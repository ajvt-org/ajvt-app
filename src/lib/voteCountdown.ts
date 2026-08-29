import { mvpVote as texts } from "./texts/mvpVote";
import { msLeft } from "./mvpVote";

const MINUTE = 60_000;

export function countdownLabel(closesAt: Date | string, now = new Date()): string | null {
  const left = msLeft(closesAt, now);
  if (left === 0) return null;
  const minutes = Math.ceil(left / MINUTE);
  if (minutes < 60) return texts.minutes(minutes);
  return texts.hours(Math.floor(minutes / 60));
}
