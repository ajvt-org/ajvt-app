"use client";

import HalfPoints from "@/components/HalfPoints";
import { countedNoun, ROUNDS } from "@/lib/arabicPlural";
import { seriesResult as texts } from "@/lib/texts";
import IconLabel from "@/components/IconLabel";
import type { SeriesConfig } from "./seriesConfig";
import type { SeriesStandingRow } from "./seriesTypes";

export function partsCounted(count: number, config: SeriesConfig): string {
  return count === 1 ? config.partWord : `${count} ${config.partsWord}`;
}

export function stateLine(standing: SeriesStandingRow, config: SeriesConfig, sides: string[]) {
  if (standing.extending && !standing.over) return texts.extending;
  if (!standing.over) {
    return config.matchEnding === "FIRST_TO" && config.partsToWin !== null
      ? texts.endsAt(countedNoun(config.partsToWin, ROUNDS))
      : texts.endsWhenAllPlayed;
  }
  if (standing.winner === null) return texts.level;
  return texts.wonThe(standing.winner === "SIDE_A" ? sides[0] : sides[1]);
}

export default function SeriesStanding({
  standing,
  config,
  sides,
}: {
  standing: SeriesStandingRow;
  config: SeriesConfig;
  sides: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name={standing.over ? "trophy" : "clock"}>
          <bdi>{sides[0]}</bdi> <HalfPoints halves={standing.sideAHalves} />
          {" — "}
          <HalfPoints halves={standing.sideBHalves} /> <bdi>{sides[1]}</bdi>
        </IconLabel>
      </span>
      <span style={{ color: "var(--text-muted)" }}>{stateLine(standing, config, sides)}</span>
      {!standing.over && (
        <span style={{ color: "var(--text-muted)" }}>
          {texts.partsLeft(partsCounted(standing.partsLeft, config))}
        </span>
      )}
    </div>
  );
}
