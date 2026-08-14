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
import { loginPathWithNext } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import type { Group, Match, RosterMember, Tab, Team } from "./types";
import MatchesTab from "./MatchesTab";
import ScorersTab from "./ScorersTab";
import StandingsTab from "./StandingsTab";
import TeamsTab from "./TeamsTab";
import BackButton from "@/components/BackButton";

export default function TournamentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const activityId = params.id;
  const title = searchParams.get("title") || "البطولة";

  const [tab, setTab] = useState<Tab>("teams");
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");

  async function loadAll() {
    try {
      const [rosterRes, groupsRes, teamsRes, matchesRes] = await Promise.all([
        fetch(`/api/admin/activities/${activityId}/roster`),
        fetch(`/api/admin/activities/${activityId}/groups`),
        fetch(`/api/admin/activities/${activityId}/teams`),
        fetch(`/api/admin/activities/${activityId}/matches`),
      ]);
      if ([rosterRes, groupsRes, teamsRes, matchesRes].some((r) => r.status === 401)) {
        router.push(loginPathWithNext("/admin/login"));
        return;
      }
      const rosterData = await rosterRes.json();
      const groupsData = await groupsRes.json();
      const teamsData = await teamsRes.json();
      const matchesData = await matchesRes.json();
      setRoster(rosterData.roster || []);
      setGroups(groupsData.groups || []);
      setTeams(teamsData.teams || []);
      setMatches(matchesData.matches || []);
    } catch {
      setError("فشل تحميل بيانات البطولة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial fetch on mount — loadAll is also called directly from child
    // tabs after mutations (team/match changes) to refresh this page's state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-pulse" style={{ color: "var(--mint-500)" }}>
          ⏳
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <div className="flex items-center gap-3">
          <BackButton href="/admin/activities" />
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              ⚽ إدارة البطولة
            </p>
            <p className="text-sm font-black text-white leading-none">{title}</p>
          </div>
        </div>
        <a
          href={`/tournament/${activityId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
        >
          🌐 الصفحة العامة
        </a>
      </div>

      <div className="admin-page">
        {error && (
          <div
            className="p-3 rounded-xl text-sm font-semibold mb-4"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-5">
          {(
            [
              ["teams", "الفرق"],
              ["matches", "المباريات"],
              ["standings", "الترتيب"],
              ["scorers", "الإحصائيات"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
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
            roster={roster}
            onChange={loadAll}
          />
        )}
        {tab === "matches" && (
          <MatchesTab
            activityId={activityId}
            teams={teams}
            groups={groups}
            matches={matches}
            onChange={loadAll}
          />
        )}
        {tab === "standings" && (
          <StandingsTab
            title={title}
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
