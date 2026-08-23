"use client";

import StatsToggle from "@/components/tournament/StatsToggle";
import StandingsTable from "@/components/tournament/StandingsTable";
import { computeStats, formatMatchDateTime, type StandingsRow } from "@/lib/tournament";
import type { Group, Match } from "./types";
import IconLabel from "@/components/IconLabel";
import { standingsAdmin as texts } from "@/lib/texts";

export default function StandingsTab({
  title,
  standingsByGroup,
  groups,
  stats,
  matches,
}: {
  title: string;
  standingsByGroup: { groupId: string | null; standings: StandingsRow[] }[];
  groups: Group[];
  stats: ReturnType<typeof computeStats>;
  matches: Match[];
}) {
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
  const hasAnyTeams = standingsByGroup.some((g) => g.standings.length > 0);
  const singleFlatTable = standingsByGroup.length === 1 && standingsByGroup[0].groupId === null;

  const groupTitle = (groupId: string | null) =>
    groupId ? groupNameById.get(groupId) || texts.group : texts.noGroup;

  function exportCSV() {
    const rows: string[][] = [];
    rows.push([texts.csvStandings]);
    for (const group of standingsByGroup) {
      if (!singleFlatTable) rows.push([groupTitle(group.groupId)]);
      rows.push([...texts.csvStandingsColumns]);
      group.standings.forEach((r, i) => {
        rows.push([
          String(i + 1),
          r.name,
          String(r.played),
          String(r.won),
          String(r.drawn),
          String(r.lost),
          String(r.gf),
          String(r.ga),
          String(r.gd),
          String(r.points),
        ]);
      });
      rows.push([]);
    }
    rows.push([texts.csvResults]);
    rows.push([...texts.csvResultsColumns]);
    matches
      .filter((m) => m.status === "PLAYED")
      .forEach((m) => {
        rows.push([
          m.round || "",
          m.homeTeam.name,
          `${m.homeScore} - ${m.awayScore}`,
          m.awayTeam.name,
          m.venue || "",
          m.matchDate ? formatMatchDateTime(m.matchDate) : "",
        ]);
      });

    const csv =
      "﻿" +
      rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-${texts.csvFileSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!hasAnyTeams) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
        {texts.noTeams}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <StatsToggle
        matchesPlayed={stats.matchesPlayed}
        totalGoals={stats.totalGoals}
        avgGoalsPerMatch={stats.avgGoalsPerMatch}
        bestAttack={stats.bestAttack ? `${stats.bestAttack.name} (${stats.bestAttack.gf})` : "—"}
      />

      <button
        onClick={exportCSV}
        className="text-xs px-3 py-1.5 rounded-lg font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        <IconLabel name="download">{texts.exportCsv}</IconLabel>
      </button>

      {standingsByGroup.map((group) => (
        <StandingsTable
          key={group.groupId ?? "none"}
          title={singleFlatTable ? null : groupTitle(group.groupId)}
          rows={group.standings}
          showFollow={false}
        />
      ))}
    </div>
  );
}
