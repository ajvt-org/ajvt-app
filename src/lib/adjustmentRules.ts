import { HALVES_PER_PART, type RecordedAdjustment, type SeriesSide } from "./matchSeries";

export const MAX_ADJUSTMENT_PARTS = 10;

export interface RuleShape {
  name: string;
  partsToSelf: number;
  partsFromOther: number;
}

export type RuleProblem = "name" | "parts" | "noEffect";

export function ruleProblem(rule: RuleShape): RuleProblem | null {
  if (!rule.name.trim()) return "name";
  for (const parts of [rule.partsToSelf, rule.partsFromOther]) {
    if (!Number.isInteger(parts) || parts < 0 || parts > MAX_ADJUSTMENT_PARTS) return "parts";
  }
  if (rule.partsToSelf === 0 && rule.partsFromOther === 0) return "noEffect";
  return null;
}

export interface RecordedInstance {
  order: number;
  side: SeriesSide;
  rule: { partsToSelf: number; partsFromOther: number };
}

export function asAdjustments(recorded: RecordedInstance[]): RecordedAdjustment[] {
  return recorded.map((row) => ({
    order: row.order,
    side: row.side,
    selfHalves: row.rule.partsToSelf * HALVES_PER_PART,
    otherHalves: row.rule.partsFromOther * HALVES_PER_PART,
  }));
}
