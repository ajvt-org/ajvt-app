"use client";

import StatsToggle from "@/components/tournament/StatsToggle";
import TeamLogo from "@/components/tournament/TeamLogo";
import { computeStats, formatMatchDateTime, type StandingsRow } from "@/lib/tournament";
import type { Group, Match } from "./types";
import IconLabel from "@/components/IconLabel";

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

  function exportCSV() {
    const rows: string[][] = [];
    rows.push(["الترتيب"]);
    for (const group of standingsByGroup) {
      if (!singleFlatTable)
        rows.push([group.groupId ? groupNameById.get(group.groupId) || "" : "بدون مجموعة"]);
      rows.push(["#", "الفريق", "لعب", "فاز", "تعادل", "خسر", "له", "عليه", "الفرق", "نقاط"]);
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
    rows.push(["النتائج"]);
    rows.push(["الجولة", "المضيف", "النتيجة", "الضيف", "الملعب", "التاريخ"]);
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
    a.download = `${title}-الترتيب-والنتائج.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!hasAnyTeams) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
        لا توجد فرق بعد
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
        <IconLabel name="download">تصدير الترتيب والنتائج</IconLabel>
      </button>

      {standingsByGroup.map((group) => (
        <div key={group.groupId ?? "none"} className="card overflow-x-auto">
          {!singleFlatTable && (
            <p className="text-sm font-bold px-3 pt-3" style={{ color: "var(--text-main)" }}>
              {group.groupId ? groupNameById.get(group.groupId) || "مجموعة" : "بدون مجموعة"}
            </p>
          )}
          <table className="w-full text-sm" style={{ minWidth: "480px" }}>
            <thead>
              <tr style={{ background: "var(--mint-100)" }}>
                {["#", "الفريق", "نقاط", "لعب", "فاز", "تعادل", "خسر", "له", "عليه", "الفرق"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-2 py-2 text-center font-bold"
                      style={{ color: "var(--mint-700)" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {group.standings.map((r, i) => (
                <tr key={r.teamId} style={{ borderTop: "1px solid var(--mint-100)" }}>
                  <td className="px-2 py-2 text-center">{i + 1}</td>
                  <td className="px-2 py-2 font-bold" style={{ color: "var(--text-main)" }}>
                    <span className="flex items-center gap-1.5 justify-center">
                      <TeamLogo logo={r.logo} name={r.name} size={18} />
                      {r.name}
                    </span>
                  </td>
                  <td
                    className="px-2 py-2 text-center font-black"
                    style={{ color: "var(--mint-700)" }}
                  >
                    {r.points}
                  </td>
                  <td className="px-2 py-2 text-center">{r.played}</td>
                  <td className="px-2 py-2 text-center">{r.won}</td>
                  <td className="px-2 py-2 text-center">{r.drawn}</td>
                  <td className="px-2 py-2 text-center">{r.lost}</td>
                  <td className="px-2 py-2 text-center">{r.gf}</td>
                  <td className="px-2 py-2 text-center">{r.ga}</td>
                  <td className="px-2 py-2 text-center">{r.gd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export function RankBadge({ i }: { i: number }) {
  return (
    <span
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 leading-none"
      style={{
        background: i === 0 ? "#fde68a" : "var(--mint-100)",
        color: i === 0 ? "#92400e" : "var(--mint-700)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {i + 1}
    </span>
  );
}
