"use client";

import { useMemo } from "react";
import {
  computeTopScorers,
  computeStats,
  computeDisciplineStats,
  computeCleanSheets,
  computeMotmLeaders,
  computeTeamAdvancedStats,
} from "@/lib/tournament";
import { groupStandings } from "@/lib/standings";
import { entrantIdentities, namedEntrant } from "@/lib/entrantName";
import { OPEN_SQUAD, isSinglesSquad, squadOf } from "@/lib/squadSize";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import { tournamentWorkspace as texts } from "@/lib/texts";
import DaysTab from "./DaysTab";
import DisciplineTab from "./DisciplineTab";
import MatchesTab from "./MatchesTab";
import PlayersTab from "./PlayersTab";
import ScorersTab from "./ScorersTab";
import StandingsTab from "./StandingsTab";
import TeamsTab from "./TeamsTab";
import type { TournamentTabKey } from "./tournamentTabs";
import type { useTournamentData } from "./useTournamentData";

export default function TournamentPanel({
  activityId,
  tab,
  data,
}: {
  activityId: string;
  tab: TournamentTabKey;
  data: ReturnType<typeof useTournamentData>;
}) {
  const { groups, roster, info } = data;
  const squad = info ? squadOf(info) : OPEN_SQUAD;
  const singles = isSinglesSquad(squad);
  const identities = useMemo(
    () => entrantIdentities(data.teams, { min: squad.min, max: squad.max }),
    [data.teams, squad.min, squad.max],
  );
  const teams = useMemo(
    () => data.teams.map((team) => ({ ...team, ...identities.get(team.id) })),
    [data.teams, identities],
  );
  const matches = useMemo(
    () =>
      data.matches.map((match) => ({
        ...match,
        homeTeam: namedEntrant(match.homeTeam, identities),
        awayTeam: namedEntrant(match.awayTeam, identities),
      })),
    [data.matches, identities],
  );
  const football = (info?.matchShape ?? "FOOTBALL") === "FOOTBALL";
  const suspendedIds = data.suspensions.filter((s) => s.running).map((s) => s.member.id);

  const standingsByGroup = useMemo(
    () =>
      groupStandings(
        teams,
        matches,
        groups.map((g) => g.id),
      ),
    [teams, matches, groups],
  );
  const topScorers = useMemo(() => computeTopScorers(teams, matches), [matches, teams]);
  const stats = useMemo(() => computeStats(teams, matches), [teams, matches]);
  const discipline = useMemo(() => computeDisciplineStats(teams, matches), [teams, matches]);
  const cleanSheets = useMemo(() => computeCleanSheets(teams, matches), [teams, matches]);
  const motmLeaders = useMemo(() => computeMotmLeaders(teams, matches), [teams, matches]);
  const teamAdvancedStats = useMemo(
    () => computeTeamAdvancedStats(teams, matches),
    [teams, matches],
  );

  const reloadSquads = () =>
    Promise.all([data.reloadTeams(), data.reloadRoster(), data.reloadGroups()]);

  if (data.loading) return <PageLoading />;

  return (
    <div className="space-y-4">
      {data.error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{data.error}</IconLabel>
        </div>
      )}

      {tab === "teams" &&
        (singles ? (
          <PlayersTab
            activityId={activityId}
            teams={teams}
            roster={roster}
            onChange={reloadSquads}
          />
        ) : (
          <TeamsTab
            activityId={activityId}
            teams={teams}
            settings={{
              squad,
              organisedByHomeVillage: info?.organisedByHomeVillage ?? false,
              outsidePlayerLimit: info?.outsidePlayerLimit ?? null,
            }}
            roster={roster}
            suspendedIds={suspendedIds}
            onChange={reloadSquads}
          />
        ))}
      {tab === "days" && <DaysTab activityId={activityId} onMatchesChanged={data.reloadMatches} />}
      {tab === "matches" && (
        <MatchesTab
          activityId={activityId}
          teams={teams}
          groups={groups}
          format={info?.format ?? null}
          matchShape={info?.matchShape ?? "FOOTBALL"}
          matches={matches}
          suspendedIds={suspendedIds}
          mvpVoteMinutes={data.mvpVoteMinutes}
          onChange={() => {
            data.reloadMatches();
            data.reloadDiscipline();
          }}
        />
      )}
      {tab === "standings" && (
        <StandingsTab
          title={info?.title || texts.fallbackTitle}
          standingsByGroup={standingsByGroup}
          groups={groups}
          stats={stats}
          matches={matches}
        />
      )}
      {tab === "discipline" && football && (
        <DisciplineTab
          activityId={activityId}
          teams={teams}
          suspensions={data.suspensions}
          rules={data.rules}
          onChange={data.reloadDiscipline}
        />
      )}
      {tab === "scorers" && (
        <ScorersTab
          matchShape={info?.matchShape ?? "FOOTBALL"}
          topScorers={topScorers}
          discipline={discipline}
          cleanSheets={cleanSheets}
          motmLeaders={motmLeaders}
          teamAdvancedStats={teamAdvancedStats}
        />
      )}
    </div>
  );
}
