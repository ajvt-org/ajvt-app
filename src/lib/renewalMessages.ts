import { members } from "./messages";
import type { RenewalRefusal } from "./renewal";

const REFUSALS: Record<NonNullable<RenewalRefusal>, string> = {
  notActive: members.renewNotActive,
  notIssued: members.renewNotIssued,
  alreadyRenewed: members.renewAlreadyDone,
  yearBehind: members.renewYearBehind,
};

export function renewalRefusalMessage(refusal: NonNullable<RenewalRefusal>): string {
  return REFUSALS[refusal];
}
