import type { SeriesSide } from "./matchSeries";

export type WorthWhen = "LOSER_ON_NOTHING" | "WINNER_LOST_CREDIT";

export const MAX_DECLARED_WORTH = 10;

export interface WorthRuleShape {
  name: string;
  levelId: string;
  when: WorthWhen[];
  worth: number;
}

const SITUATIONS: WorthWhen[] = ["LOSER_ON_NOTHING", "WINNER_LOST_CREDIT"];

export type WorthProblem = "name" | "level" | "when" | "worth";

export function worthRuleProblem(rule: WorthRuleShape): WorthProblem | null {
  if (!rule.name.trim()) return "name";
  if (!rule.levelId.trim()) return "level";
  if (rule.when.length === 0) return "when";
  if (rule.when.some((when) => !SITUATIONS.includes(when))) return "when";
  if (!Number.isInteger(rule.worth) || rule.worth < 2 || rule.worth > MAX_DECLARED_WORTH) {
    return "worth";
  }
  return null;
}

export interface ClosedUnit {
  winner: SeriesSide | null;
  over: boolean;
  sideAAtClose: number;
  sideBAtClose: number;
  sideALostCredit: boolean;
  sideBLostCredit: boolean;
}

function loserWasOnNothing(closed: ClosedUnit): boolean {
  return closed.winner === "SIDE_A" ? closed.sideBAtClose === 0 : closed.sideAAtClose === 0;
}

function winnerLostItsCredit(closed: ClosedUnit): boolean {
  return closed.winner === "SIDE_A" ? closed.sideALostCredit : closed.sideBLostCredit;
}

function situationHolds(when: WorthWhen, closed: ClosedUnit): boolean {
  return when === "LOSER_ON_NOTHING" ? loserWasOnNothing(closed) : winnerLostItsCredit(closed);
}

export function conditionHolds(when: WorthWhen[], closed: ClosedUnit): boolean {
  if (!closed.over || closed.winner === null) return false;
  return when.some((situation) => situationHolds(situation, closed));
}

export function detectedWorth<T extends WorthRuleShape>(
  rules: T[],
  levelId: string,
  closed: ClosedUnit,
): T | null {
  return (
    rules.find((rule) => rule.levelId === levelId && conditionHolds(rule.when, closed)) ?? null
  );
}
