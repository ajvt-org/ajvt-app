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
import { useRouter, useParams, useSearchParams } from "next/navigation";
import type { Tab } from "./types";
import MatchesTab from "./MatchesTab";
import ScorersTab from "./ScorersTab";
import StandingsTab from "./StandingsTab";
import TeamsTab from "./TeamsTab";
import { useTournamentData } from "./useTournamentData";
import BackButton from "@/components/BackButton";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";

const TABS: [Tab, string][] = [
  ["teams", "الفرق"],
  ["matches", "المباريات"],
  ["standings", "الترتيب"],
  ["scorers", "الإحصائيات"],
];

function TournamentPageInner() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const activityId = params.id;
  const data = useTournamentData(activityId);

  const requested = searchParams.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.some(([key]) => key === requested) ? requested : "teams";

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

  return (
    <div>
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <div className="flex items-center gap-3">
          <BackButton href={`/admin/activities/${activityId}`} />
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              <IconLabel name="ball">إدارة البطولة</IconLabel>
            </p>
            <p className="text-sm font-black text-white leading-none">{info?.title || "البطولة"}</p>
          </div>
        </div>
        <a
          href={`/tournament/${activityId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
        >
          <IconLabel name="link">الصفحة العامة</IconLabel>
        </a>
      </div>

      <div className="admin-page">
        {data.error && (
          <div
            className="p-3 rounded-xl text-sm font-semibold mb-4"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            <IconLabel name="warning">{data.error}</IconLabel>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-5">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => pickTab(key)}
              className="rounded-xl py-2.5 text-center text-sm font-bold transition-all"
              style={{
                background: tab === key ? "var(--mint-700)" : "white",
                color: tab === key ? "white" : "var(--text-main)",
                border: tab === key ? "none" : "1px solid var(--mint-100)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "teams" && (
          <TeamsTab
            activityId={activityId}
            teams={teams}
            groups={groups}
            format={info?.format ?? null}
            teamSize={info?.teamSize ?? null}
            roster={roster}
            onChange={reloadSquads}
          />
        )}
        {tab === "matches" && (
          <MatchesTab
            activityId={activityId}
            teams={teams}
            groups={groups}
            format={info?.format ?? null}
            matches={matches}
            onChange={data.reloadMatches}
          />
        )}
        {tab === "standings" && (
          <StandingsTab
            title={info?.title || "البطولة"}
            standingsByGroup={standingsByGroup}
            groups={groups}
            stats={stats}
            matches={matches}
          />
        )}
        {tab === "scorers" && (
          <ScorersTab
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
