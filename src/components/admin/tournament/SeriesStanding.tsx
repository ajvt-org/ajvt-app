"use client";

import HalfPoints from "@/components/HalfPoints";
import { countedUnits, definiteUnits } from "@/lib/matchLevels";
import { seriesResult as texts } from "@/lib/texts";
import IconLabel from "@/components/IconLabel";
import type { SeriesConfig } from "./seriesConfig";
import type { SeriesStandingRow } from "./seriesTypes";

export function stateLine(standing: SeriesStandingRow, config: SeriesConfig, sides: string[]) {
  if (standing.extending && !standing.over) {
    return texts.extending(countedUnits(config.match.continueUnits ?? 0, config.unit));
  }
  if (!standing.over) {
    return config.match.endsBy === "TARGET" && config.match.target !== null
      ? texts.endsAt(countedUnits(config.match.target, config.unit))
      : texts.endsWhenAllPlayed(definiteUnits(config.unit));
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
          <bdi>{sides[0]}</bdi>{" "}
          <HalfPoints halves={standing.sideATotal} perUnit={standing.perUnit} />
          {" — "}
          <HalfPoints halves={standing.sideBTotal} perUnit={standing.perUnit} />{" "}
          <bdi>{sides[1]}</bdi>
        </IconLabel>
      </span>
      <span style={{ color: "var(--text-muted)" }}>{stateLine(standing, config, sides)}</span>
      {!standing.over && (
        <span style={{ color: "var(--text-muted)" }}>
          {texts.unitsLeft(countedUnits(standing.unitsLeft, config.unit))}
        </span>
      )}
    </div>
  );
}
