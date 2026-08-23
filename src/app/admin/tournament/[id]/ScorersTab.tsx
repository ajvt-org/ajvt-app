"use client";

import {
  type TopScorerRow,
  type DisciplineRow,
  type CleanSheetRow,
  type MotmRow,
  type TeamAdvancedRow,
} from "@/lib/tournament";
import { RankBadge } from "./StandingsTab";
import CardChip from "@/components/tournament/CardChip";
import TeamFormList from "@/components/tournament/TeamFormList";
import TournamentTabs, { type TournamentPanel } from "@/components/tournament/TournamentTabs";
import IconLabel from "@/components/IconLabel";

function Empty({ children }: { children: string }) {
  return (
    <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}

function PersonRow({
  i,
  fullName,
  teamName,
  value,
}: {
  i: number;
  fullName: string;
  teamName: string;
  value: React.ReactNode;
}) {
  return (
    <div className="card p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <RankBadge i={i} />
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
            {fullName}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {teamName}
          </p>
        </div>
      </div>
      {value}
    </div>
  );
}

export default function ScorersTab({
  profile,
  topScorers,
  discipline,
  cleanSheets,
  motmLeaders,
  teamAdvancedStats,
}: {
  profile: "FOOTBALL" | "BOARD";
  topScorers: TopScorerRow[];
  discipline: DisciplineRow[];
  cleanSheets: CleanSheetRow[];
  motmLeaders: MotmRow[];
  teamAdvancedStats: TeamAdvancedRow[];
}) {
  const football = profile === "FOOTBALL";
  const teamsWithStats = teamAdvancedStats.filter((t) => t.biggestWin || t.form.length > 0);

  const teamsPanel =
    teamsWithStats.length === 0 ? (
      <Empty>لا توجد إحصائيات مسجلة بعد</Empty>
    ) : (
      <TeamFormList teams={teamsWithStats} />
    );

  if (!football) {
    return teamsPanel;
  }

  const panels: TournamentPanel[] = [
    {
      key: "scorers",
      label: "الهدافون",
      icon: "ball",
      content:
        topScorers.length === 0 ? (
          <Empty>لا توجد أهداف مسجلة بعد</Empty>
        ) : (
          <div className="space-y-2">
            {topScorers.slice(0, 15).map((s, i) => (
              <PersonRow
                key={s.memberId}
                i={i}
                fullName={s.fullName}
                teamName={s.teamName}
                value={
                  <span className="font-black" style={{ color: "var(--mint-700)" }}>
                    <IconLabel name="ball">{s.goals}</IconLabel>
                  </span>
                }
              />
            ))}
          </div>
        ),
    },
    {
      key: "discipline",
      label: "البطاقات",
      icon: "card",
      content:
        discipline.length === 0 ? (
          <Empty>لا توجد بطاقات مسجلة بعد</Empty>
        ) : (
          <div className="space-y-2">
            {discipline.slice(0, 15).map((d, i) => (
              <PersonRow
                key={d.memberId}
                i={i}
                fullName={d.fullName}
                teamName={d.teamName}
                value={
                  <span className="font-black text-sm" style={{ color: "var(--text-main)" }}>
                    {d.yellow > 0 && <CardChip type="YELLOW" count={d.yellow} />}{" "}
                    {d.red > 0 && <CardChip type="RED" count={d.red} />}
                  </span>
                }
              />
            ))}
          </div>
        ),
    },
    {
      key: "defense",
      label: "أفضل دفاع",
      icon: "glove",
      content:
        cleanSheets.length === 0 ? (
          <Empty>لا توجد بيانات كافية بعد</Empty>
        ) : (
          <div className="space-y-2">
            {cleanSheets.slice(0, 10).map((c, i) => (
              <div key={c.teamId} className="card p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <RankBadge i={i} />
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                    {c.name}
                  </p>
                </div>
                <span className="font-black" style={{ color: "var(--mint-700)" }}>
                  <IconLabel name="glove">
                    {c.cleanSheets}/{c.played}
                  </IconLabel>
                </span>
              </div>
            ))}
          </div>
        ),
    },
    {
      key: "motm",
      label: "رجل المباراة",
      icon: "star",
      content:
        motmLeaders.length === 0 ? (
          <Empty>لم يتم تحديد رجل مباراة بعد</Empty>
        ) : (
          <div className="space-y-2">
            {motmLeaders.slice(0, 10).map((m, i) => (
              <PersonRow
                key={m.memberId}
                i={i}
                fullName={m.fullName}
                teamName={m.teamName}
                value={
                  <span className="font-black" style={{ color: "var(--mint-700)" }}>
                    <IconLabel name="star">{m.count}</IconLabel>
                  </span>
                }
              />
            ))}
          </div>
        ),
    },
    { key: "teams", label: "الفرق", icon: "chart", content: teamsPanel },
  ];

  return <TournamentTabs panels={panels} variant="sub" />;
}
