import { MEMBERSHIP_ENDING_REASONS } from "./texts";

export interface EndableMembership {
  status: string;
  endedAt: Date | string | null;
}

export type EndingRefusal = "notStanding" | "alreadyEnded" | null;
export type RestoreRefusal = "notEnded" | null;

export function isEndingReason(value: unknown): value is string {
  return (MEMBERSHIP_ENDING_REASONS as readonly string[]).includes(value as string);
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
