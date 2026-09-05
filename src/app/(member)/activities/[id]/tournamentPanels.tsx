import {
  computeTopScorers,
  computeStats,
  computeDisciplineStats,
  computeCleanSheets,
  computeMotmLeaders,
  computeTeamAdvancedStats,
} from "@/lib/tournament";
import { groupStandings } from "@/lib/standings";
import { matchDateKey, todayClubDateKey } from "@/lib/clubTime";
import BracketTree from "@/components/tournament/BracketTree";
import CardChip from "@/components/tournament/CardChip";
import IconLabel from "@/components/IconLabel";
import MatchesPanel from "./MatchesPanel";
import RankedList from "@/components/tournament/RankedList";
import StandingsTable from "@/components/tournament/StandingsTable";
import TeamFormList from "@/components/tournament/TeamFormList";
import TeamsGrid from "@/components/tournament/TeamsGrid";
import TournamentSection from "@/components/tournament/TournamentSection";
import TournamentSummary from "@/components/tournament/TournamentSummary";
import TournamentTabs, { type TournamentPanel } from "@/components/tournament/TournamentTabs";
import { discipline as disciplineTexts, publicTournament as texts } from "@/lib/texts";
import { suspendedUserIds } from "@/lib/suspensionServer";
import { bothTeamsKnown } from "@/lib/fixtureTeams";
import { firstRoundIsWaiting } from "@/lib/bracketState";
import { entrantKind } from "@/lib/entrant";
import type { PublicMatch } from "@/components/tournament/publicTypes";
import type { ActivityPageData } from "./activityQuery";

export async function tournamentPanels(
  activity: ActivityPageData,
  userId: string | null,
  myVoteByVoteId: Map<string, string>,
) {
  const matches = activity.matches as PublicMatch[];
  const standingsByGroup = groupStandings(
    activity.teams,
    activity.matches,
    activity.groups.map((g) => g.id),
  );
  const topScorers = computeTopScorers(activity.teams, activity.matches);
  const stats = computeStats(activity.teams, activity.matches);
  const discipline = computeDisciplineStats(activity.teams, activity.matches);
  const cleanSheets = computeCleanSheets(activity.teams, activity.matches);
  const motmLeaders = computeMotmLeaders(activity.teams, activity.matches);
  const teamAdvancedStats = computeTeamAdvancedStats(activity.teams, activity.matches).filter(
    (t) => t.biggestWin || t.form.length > 0,
  );
  const groupNameById = new Map(activity.groups.map((g) => [g.id, g.name]));
  const singleFlatTable = standingsByGroup.length === 1 && standingsByGroup[0].groupId === null;

  const played = matches.filter((m) => m.status === "PLAYED").filter(bothTeamsKnown);
  const scheduled = matches.filter((m) => m.status === "SCHEDULED");
  const bracketMatches = activity.matches.filter(
    (m): m is typeof m & { bracketRound: number } => m.bracketRound !== null,
  );
  const todayKey = todayClubDateKey();
  const todayMatches = matches
    .filter((m) => m.matchDate && matchDateKey(m.matchDate) === todayKey)
    .sort((a, b) => new Date(a.matchDate!).getTime() - new Date(b.matchDate!).getTime());

  const board = activity.profile === "BOARD";
  const suspended =
    !board && discipline.length > 0 ? await suspendedUserIds(activity.id) : new Set<string>();
  const entrant = entrantKind(activity.teamSize);
  const words = texts.entrant[entrant];
  const participantsLabel = words.plural;
  const hasStats = board
    ? teamAdvancedStats.length > 0
    : topScorers.length > 0 ||
      discipline.length > 0 ||
      cleanSheets.length > 0 ||
      motmLeaders.length > 0 ||
      teamAdvancedStats.length > 0;

  const hasLeagueStage = matches.some((m) => !m.isKnockout) || activity.groups.length > 0;
  const bracket = (
    <div className="card p-3 space-y-2">
      {firstRoundIsWaiting(bracketMatches) && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <IconLabel name="clock">{words.bracketWaitingHint}</IconLabel>
        </p>
      )}
      <BracketTree
        matches={bracketMatches.map((m) => ({
          ...m,
          status: m.status as "SCHEDULED" | "PLAYED",
        }))}
        entrant={entrant}
      />
    </div>
  );

  const panels: TournamentPanel[] = [
    hasLeagueStage || bracketMatches.length === 0
      ? {
          key: "standings",
          label: texts.standings,
          icon: "trophy",
          content: (
            <>
              {standingsByGroup.map((group) => (
                <StandingsTable
                  key={group.groupId ?? "none"}
                  title={
                    singleFlatTable
                      ? null
                      : group.groupId
                        ? groupNameById.get(group.groupId) || texts.group
                        : texts.noGroup
                  }
                  rows={group.standings}
                  showFollow={!!userId}
                  entrant={entrant}
                />
              ))}
              {bracketMatches.length > 0 && (
                <TournamentSection icon="target" title={texts.bracket}>
                  {bracket}
                </TournamentSection>
              )}
            </>
          ),
        }
      : { key: "bracket", label: texts.bracket, icon: "target", content: bracket },
    {
      key: "matches",
      label: texts.matches,
      icon: "calendar",
      content: (
        <MatchesPanel
          played={played}
          scheduled={scheduled}
          allMatches={matches}
          football={!board}
          showScorersAndCards={activity.showScorersAndCards}
          tournamentTitle={activity.title}
          loggedIn={!!userId}
          myVoteByVoteId={myVoteByVoteId}
          teams={activity.teams}
        />
      ),
    },
    {
      key: "teams",
      label: participantsLabel,
      icon: "users",
      content: <TeamsGrid teams={activity.teams} viewerId={userId} entrant={entrant} />,
    },
  ];

  if (hasStats) {
    const statPanels: TournamentPanel[] = [];
    if (!board && topScorers.length > 0) {
      statPanels.push({
        key: "scorers",
        label: texts.scorers,
        icon: "ball",
        content: (
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
      });
    }
    if (!board && discipline.length > 0) {
      statPanels.push({
        key: "discipline",
        label: texts.discipline,
        icon: "flag",
        content: (
          <RankedList
            rows={discipline.map((d) => ({
              id: d.memberId,
              name: d.fullName,
              photo: d.photo,
              sub: d.teamName,
              badge: suspended.has(d.memberId) ? disciplineTexts.suspendedBadge : undefined,
              value: (
                <span className="flex items-center gap-2">
                  {d.yellow > 0 && <CardChip type="YELLOW" count={d.yellow} />}
                  {d.red > 0 && <CardChip type="RED" count={d.red} />}
                </span>
              ),
            }))}
          />
        ),
      });
    }
    if (!board && cleanSheets.length > 0) {
      statPanels.push({
        key: "defence",
        label: texts.defence,
        icon: "shield",
        content: (
          <RankedList
            rows={cleanSheets.map((c) => ({
              id: c.teamId,
              name: c.name,
              avatar: false,
              value: (
                <span dir="ltr">
                  {c.cleanSheets}/{c.played}
                </span>
              ),
            }))}
          />
        ),
      });
    }
    if (!board && motmLeaders.length > 0) {
      statPanels.push({
        key: "motm",
        label: texts.motm,
        icon: "star",
        content: (
          <RankedList
            rows={motmLeaders.map((m) => ({
              id: m.memberId,
              name: m.fullName,
              photo: m.photo,
              sub: m.teamName,
              value: (
                <IconLabel name="star" filled after>
                  {m.count}
                </IconLabel>
              ),
            }))}
          />
        ),
      });
    }
    if (teamAdvancedStats.length > 0) {
      statPanels.push({
        key: "teamStats",
        label: participantsLabel,
        icon: "chart",
        content: <TeamFormList teams={teamAdvancedStats} />,
      });
    }

    panels.push({
      key: "stats",
      label: texts.stats,
      icon: "chart",
      content: (
        <>
          {!board && (
            <TournamentSummary
              matchesPlayed={stats.matchesPlayed}
              totalGoals={stats.totalGoals}
              avgGoalsPerMatch={stats.avgGoalsPerMatch}
              bestAttack={stats.bestAttack}
            />
          )}
          <TournamentTabs panels={statPanels} variant="sub" />
        </>
      ),
    });
  }

  return { panels, todayMatches };
}
