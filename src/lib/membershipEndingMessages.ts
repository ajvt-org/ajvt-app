import { members } from "./messages";
import type { EndingRefusal, RestoreRefusal } from "./membershipEnding";

const ENDING: Record<NonNullable<EndingRefusal>, string> = {
  notStanding: members.endNotStanding,
  alreadyEnded: members.endAlreadyEnded,
};

const RESTORE: Record<NonNullable<RestoreRefusal>, string> = {
  notEnded: members.restoreNotEnded,
};

export function endingRefusalMessage(refusal: NonNullable<EndingRefusal>): string {
  return ENDING[refusal];
}

export function restoreRefusalMessage(refusal: NonNullable<RestoreRefusal>): string {
  return RESTORE[refusal];
}
