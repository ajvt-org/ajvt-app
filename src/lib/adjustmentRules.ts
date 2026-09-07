import type { RecordedAdjustment, SeriesSide } from "./matchSeries";

export const MAX_ADJUSTMENT_UNITS = 10;

export interface RuleShape {
  name: string;
  unitsToSelf: number;
  unitsFromOther: number;
  levelId?: string | null;
  endsUnit?: boolean;
}

export type RuleProblem = "name" | "units" | "noEffect";

export function ruleProblem(rule: RuleShape): RuleProblem | null {
  if (!rule.name.trim()) return "name";
  for (const units of [rule.unitsToSelf, rule.unitsFromOther]) {
    if (!Number.isInteger(units) || units < 0 || units > MAX_ADJUSTMENT_UNITS) return "units";
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

export function asAdjustments(
  recorded: RecordedInstance[],
  halvesPerUnit: number,
): RecordedAdjustment[] {
  return recorded.map((row) => ({
    order: row.order,
    side: row.side,
    selfHalves: row.rule.unitsToSelf * halvesPerUnit,
    otherHalves: row.rule.unitsFromOther * halvesPerUnit,
  }));
}
