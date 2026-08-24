import type { GoalKind, GoalPeriod } from "./types";
import { matchAdmin as texts } from "@/lib/texts";

export interface GoalDraft {
  teamId: string;
  memberId: string | null;
  kind: GoalKind;
  period: GoalPeriod;
  minute: string;
}

export interface KickDraft {
  teamId: string;
  memberId: string | null;
  scored: boolean;
}

export const KIND_LABEL: Record<GoalKind, string> = {
  GOAL: texts.kindGoal,
  PENALTY: texts.kindPenalty,
  OWN_GOAL: texts.kindOwnGoal,
};

export function goalSuffix(kind: GoalKind): string {
  if (kind === "PENALTY") return ` (${texts.kindPenalty})`;
  if (kind === "OWN_GOAL") return ` (${texts.kindOwnGoal})`;
  return "";
}
