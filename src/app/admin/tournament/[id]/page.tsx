"use client";

import {
  groupStandings,
  computeTopScorers,
  computeStats,
  computeDisciplineStats,
  computeCleanSheets,
  computeMotmLeaders,
  computeTeamAdvancedStats,
} from "@/lib/tournament";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import type { Tab } from "./types";
import MatchesTab from "./MatchesTab";
import ScorersTab from "./ScorersTab";
import StandingsTab from "./StandingsTab";
import TeamsTab from "./TeamsTab";
import PlayersTab from "./PlayersTab";
import DaysTab from "./DaysTab";
import { useTournamentData } from "./useTournamentData";
import WorkspaceTabs, { type WorkspaceTab } from "@/components/admin/WorkspaceTabs";
import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import { toThumbUrl } from "@/lib/utils";
import { countedNoun } from "@/lib/arabicCount";
import { MATCH, PLAYER, TEAM } from "@/lib/messages";
import { tournamentWorkspace as texts } from "@/lib/texts";

function tabsFor(singles: boolean): WorkspaceTab[] {
  return [
    {
      key: "teams",
      label: singles ? texts.tabs.players : texts.tabs.teams,
      icon: singles ? "user" : "users",
    },
    { key: "days", label: texts.tabs.days, icon: "calendar" },
    { key: "matches", label: texts.tabs.matches, icon: "swords" },
    { key: "standings", label: texts.tabs.standings, icon: "list" },
    { key: "scorers", label: texts.tabs.scorers, icon: "chart" },
  ];
}

function TournamentPageInner() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const activityId = params.id;
  const data = useTournamentData(activityId);

  const singles = data.info?.teamSize === 1;
  const TABS = tabsFor(singles);
  const requested = searchParams.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.some((t) => t.key === requested) ? requested : "teams";

  function pickTab(next: Tab) {
    router.replace(`/admin/tournament/${activityId}?tab=${next}`, { scroll: false });
  }

  const { teams, matches, groups, roster, info } = data;
  const standingsByGroup = useMemo(() => groupStandings(teams, matches), [teams, matches]);
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

  if (data.loading) {
    return <PageLoading />;
  }

  const sideCount = teams.length;
  const sideNoun = countedNoun(sideCount, singles ? PLAYER : TEAM);

  return (
    <div className="admin-page space-y-4">
      <Link
        href={`/admin/activities/${activityId}?tab=teams`}
        className="text-sm font-bold inline-block"
        style={{ color: "var(--mint-600)" }}
      >
        <ArrowLabel direction="back">{texts.backToActivity}</ArrowLabel>
      </Link>

      <div className="card p-4 flex items-center gap-3 flex-wrap">
        {info?.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={toThumbUrl(`/api/files/activity/${info.photo}`)}
            alt={info.title}
            className="w-14 h-14 rounded-xl object-cover shrink-0"
          />
        ) : (
          <span
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--mint-100)" }}
          >
            <Icon name="trophy" size={24} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-black text-base truncate" style={{ color: "var(--text-main)" }}>
            {info?.title || texts.fallbackTitle}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {sideCount} {sideNoun} · {matches.length} {countedNoun(matches.length, MATCH)}
          </p>
        </div>
        <a
          href={`/tournament/${activityId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="link">{texts.publicPage}</IconLabel>
        </a>
      </div>

      <WorkspaceTabs tabs={TABS} active={tab} onPick={(key) => pickTab(key as Tab)} />

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
              groups={groups}
              format={info?.format ?? null}
              roster={roster}
              onChange={reloadSquads}
            />
          ) : (
            <TeamsTab
              activityId={activityId}
              teams={teams}
              groups={groups}
              format={info?.format ?? null}
              teamSize={info?.teamSize ?? null}
              roster={roster}
              onChange={reloadSquads}
            />
          ))}
        {tab === "days" && (
          <DaysTab activityId={activityId} onMatchesChanged={data.reloadMatches} />
        )}
        {tab === "matches" && (
          <MatchesTab
            activityId={activityId}
            teams={teams}
            groups={groups}
            format={info?.format ?? null}
            profile={info?.profile ?? "FOOTBALL"}
            matches={matches}
            onChange={data.reloadMatches}
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
        {tab === "scorers" && (
          <ScorersTab
            profile={info?.profile ?? "FOOTBALL"}
            topScorers={topScorers}
            discipline={discipline}
            cleanSheets={cleanSheets}
            motmLeaders={motmLeaders}
            teamAdvancedStats={teamAdvancedStats}
          />
        )}
      </div>
    </div>
  );
}

export default function TournamentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TournamentPageInner />
    </Suspense>
  );
}
