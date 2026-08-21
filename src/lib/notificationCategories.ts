import { push } from "./messages";

export interface NotificationCategory {
  key: string;
  label: string;
  optOut: boolean;
}

export const NOTIFICATION_CATEGORIES = [
  { key: "MEMBERSHIP_DECISION", label: push.membershipDecision, optOut: false },
  { key: "ACTIVITY_DECISION", label: push.activityDecision, optOut: false },
  { key: "QUIZ_ROUND", label: push.quizRound, optOut: true },
  { key: "TOURNAMENT_MATCH", label: push.tournamentMatch, optOut: true },
  { key: "MATCH_REMINDER", label: push.matchReminder, optOut: true },
  { key: "REQUEST_REMINDER", label: push.requestReminder, optOut: true },
  { key: "BROADCAST", label: push.broadcast, optOut: true },
] as const satisfies readonly NotificationCategory[];

export type CategoryKey = (typeof NOTIFICATION_CATEGORIES)[number]["key"];

export const CATEGORY_KEYS = NOTIFICATION_CATEGORIES.map((c) => c.key) as CategoryKey[];

export const OPT_OUT_CATEGORIES = NOTIFICATION_CATEGORIES.filter((c) => c.optOut);

export function isOptOutCategory(key: string): boolean {
  return NOTIFICATION_CATEGORIES.some((c) => c.key === key && c.optOut);
}
