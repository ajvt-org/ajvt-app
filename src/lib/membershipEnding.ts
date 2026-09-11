import { MEMBERSHIP_ENDING_REASONS } from "./texts";

export interface EndableMembership {
  status: string;
  endedAt: Date | string | null;
}

export type EndingRefusal = "notStanding" | "alreadyEnded" | null;
export type RestoreRefusal = "notEnded" | null;

export const MAX_ENDING_REASON = 120;

export function isEndingReason(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if ((MEMBERSHIP_ENDING_REASONS as readonly string[]).includes(value)) return true;
  const written = value.trim();
  return written.length > 0 && written.length <= MAX_ENDING_REASON;
}

export function endingRefusal(membership: EndableMembership): EndingRefusal {
  if (membership.status !== "ACTIVE") return "notStanding";
  if (membership.endedAt) return "alreadyEnded";
  return null;
}

export function restoreRefusal(membership: EndableMembership): RestoreRefusal {
  if (!membership.endedAt) return "notEnded";
  return null;
}

export function canEnd(membership: EndableMembership): boolean {
  return endingRefusal(membership) === null;
}

export function canRestore(membership: EndableMembership): boolean {
  return restoreRefusal(membership) === null;
}
