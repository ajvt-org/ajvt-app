import type { RecordedMove, SeriesSide } from "./matchSeries";

export const MAX_MOVE_UNITS = 10;
export const MAX_UNIT_WORTH = 10;

export interface RuleShape {
  name: string;
  unitsToSelf: number;
  unitsFromOther: number;
  levelId: string;
  endsUnit?: boolean;
  unitWorth?: number | null;
}

export type RuleProblem = "name" | "units" | "noEffect" | "level" | "worth";

export function ruleProblem(rule: RuleShape): RuleProblem | null {
  if (!rule.name.trim()) return "name";
  if (!rule.levelId.trim()) return "level";
  for (const units of [rule.unitsToSelf, rule.unitsFromOther]) {
    if (!Number.isInteger(units) || units < 0 || units > MAX_MOVE_UNITS) return "units";
  }
  const worth = rule.unitWorth ?? null;
  if (worth !== null && (!Number.isInteger(worth) || worth < 1 || worth > MAX_UNIT_WORTH)) {
    return "worth";
  }
  if (
    rule.unitsToSelf === 0 &&
    rule.unitsFromOther === 0 &&
    rule.endsUnit !== true &&
    worth === null
  ) {
    return "noEffect";
  }
  return null;
}

export function marksAWorth(rule: { unitWorth: number | null }): boolean {
  return rule.unitWorth !== null;
}

export interface RecordedInstance {
  order: number;
  side: SeriesSide;
  rule: { unitsToSelf: number; unitsFromOther: number };
}

export function offerableRules<T extends { levelId: string }>(
  rules: T[],
  levelIds: (string | null)[],
): T[] {
  const declared = new Set(levelIds.filter((id): id is string => id !== null));
  return rules.filter((rule) => declared.has(rule.levelId));
}

export function asMoves(recorded: RecordedInstance[], perUnit: number): RecordedMove[] {
  return recorded.map((row) => ({
    order: row.order,
    side: row.side,
    selfHalves: row.rule.unitsToSelf * perUnit,
    otherHalves: row.rule.unitsFromOther * perUnit,
  }));
}
