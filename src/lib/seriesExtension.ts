import { countedUnits, type LevelRow } from "./matchLevels";
import { seriesResult as texts } from "./texts";

export function extensionLine(match: LevelRow): string | null {
  if (match.unsettled === "DECIDER") return texts.extendingByDecider;
  const more = match.continueUnits ?? 0;
  return more > 0 ? texts.extending(countedUnits(more)) : null;
}
