"use client";

import {
  type TopScorerRow,
  type DisciplineRow,
  type CleanSheetRow,
  type MotmRow,
  type TeamAdvancedRow,
} from "@/lib/tournament";
import CardChip from "@/components/tournament/CardChip";
import RankedList from "@/components/tournament/RankedList";
import TeamFormList from "@/components/tournament/TeamFormList";
import TournamentTabs, { type TournamentPanel } from "@/components/tournament/TournamentTabs";
import IconLabel from "@/components/IconLabel";
import { statsAdmin as statsTexts } from "@/lib/texts";

function Empty({ children }: { children: string }) {
  return (
    <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
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
      <Empty>{statsTexts.noStats}</Empty>
    ) : (
      <TeamFormList teams={teamsWithStats} />
    );

  if (!football) {
    return teamsPanel;
  }

  const panels: TournamentPanel[] = [
    {
      key: "scorers",
      label: statsTexts.scorers,
      icon: "ball",
      content:
        topScorers.length === 0 ? (
          <Empty>{statsTexts.noGoals}</Empty>
        ) : (
          <RankedList
            rows={topScorers.map((s) => ({
              id: s.memberId,
              name: s.fullName,
              photo: s.photo,
              sub: s.teamName,
              value: (
                <IconLabel name="ball" after>
                  {s.goals}
                </IconLabel>
              ),
            }))}
          />
        ),
    },
    {
      key: "discipline",
      label: statsTexts.cards,
      icon: "card",
      content:
        discipline.length === 0 ? (
          <Empty>{statsTexts.noCards}</Empty>
        ) : (
          <RankedList
            rows={discipline.map((d) => ({
              id: d.memberId,
              name: d.fullName,
              photo: d.photo,
              sub: d.teamName,
              value: (
                <span className="flex items-center gap-2">
                  {d.yellow > 0 && <CardChip type="YELLOW" count={d.yellow} />}
                  {d.red > 0 && <CardChip type="RED" count={d.red} />}
                </span>
              ),
            }))}
          />
        ),
    },
    {
      key: "defense",
      label: statsTexts.defense,
      icon: "glove",
      content:
        cleanSheets.length === 0 ? (
          <Empty>{statsTexts.noDefense}</Empty>
        ) : (
          <RankedList
            rows={cleanSheets.map((c) => ({
              id: c.teamId,
              name: c.name,
              avatar: false,
              value: (
                <span dir="ltr">
                  <IconLabel name="glove" after>
                    {c.cleanSheets}/{c.played}
                  </IconLabel>
                </span>
              ),
            }))}
          />
        ),
    },
    {
      key: "motm",
      label: statsTexts.motm,
      icon: "star",
      content:
        motmLeaders.length === 0 ? (
          <Empty>{statsTexts.noMotm}</Empty>
        ) : (
          <RankedList
            rows={motmLeaders.map((m) => ({
              id: m.memberId,
              name: m.fullName,
              photo: m.photo,
              sub: m.teamName,
              value: (
                <IconLabel name="star" after>
                  {m.count}
                </IconLabel>
              ),
            }))}
          />
        ),
    },
    { key: "teams", label: statsTexts.teams, icon: "chart", content: teamsPanel },
  ];

  return <TournamentTabs panels={panels} variant="sub" />;
}
