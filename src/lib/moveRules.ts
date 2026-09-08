import type { RecordedMove, SeriesSide } from "./matchSeries";

export const MAX_MOVE_UNITS = 10;

export interface RuleShape {
  name: string;
  unitsToSelf: number;
  unitsFromOther: number;
  levelId: string;
  endsUnit?: boolean;
}

export type RuleProblem = "name" | "units" | "noEffect" | "level";

export function ruleProblem(rule: RuleShape): RuleProblem | null {
  if (!rule.name.trim()) return "name";
  if (!rule.levelId.trim()) return "level";
  for (const units of [rule.unitsToSelf, rule.unitsFromOther]) {
    if (!Number.isInteger(units) || units < 0 || units > MAX_MOVE_UNITS) return "units";
  }
  if (rule.unitsToSelf === 0 && rule.unitsFromOther === 0 && rule.endsUnit !== true) {
    return "noEffect";
  }
  return null;
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
