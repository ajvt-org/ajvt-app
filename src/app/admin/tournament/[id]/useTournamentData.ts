"use client";

// One loader per data domain, so a mutation refetches what it touched and
// nothing else. The old shell refired all four requests after every edit.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import type { Group, Match, RosterMember, Team, TournamentFormat } from "./types";

export interface TournamentInfo {
  id: string;
  title: string;
  isTournament: boolean;
  format: TournamentFormat;
  profile: "FOOTBALL" | "BOARD";
  teamSize: number | null;
  startsAt: string | null;
  endsAt: string | null;
}

export function useTournamentData(activityId: string) {
  const router = useRouter();
  const [info, setInfo] = useState<TournamentInfo | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (path: string, apply: (data: never) => void) => {
      const base = `/api/admin/activities/${activityId}`;
      const res = await fetch(path ? `${base}/${path}` : base);
      if (res.status === 401) {
        router.push(loginPathWithNext("/admin/login"));
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      apply((await res.json()) as never);
    },
    [activityId, router],
  );

  const reloadInfo = useCallback(
    () => load("", (d: { activity: TournamentInfo }) => setInfo(d.activity)),
    [load],
  );
  const reloadRoster = useCallback(
    () => load("roster", (d: { roster: RosterMember[] }) => setRoster(d.roster || [])),
    [load],
  );
  const reloadGroups = useCallback(
    () => load("groups", (d: { groups: Group[] }) => setGroups(d.groups || [])),
    [load],
  );
  const reloadTeams = useCallback(
    () => load("teams", (d: { teams: Team[] }) => setTeams(d.teams || [])),
    [load],
  );
  const reloadMatches = useCallback(
    () => load("matches", (d: { matches: Match[] }) => setMatches(d.matches || [])),
    [load],
  );

  useEffect(() => {
    Promise.all([reloadInfo(), reloadRoster(), reloadGroups(), reloadTeams(), reloadMatches()])
      .catch(() => setError("فشل تحميل بيانات البطولة"))
      .finally(() => setLoading(false));
  }, [reloadInfo, reloadRoster, reloadGroups, reloadTeams, reloadMatches]);

  return {
    info,
    roster,
    groups,
    teams,
    matches,
    loading,
    error,
    reloadInfo,
    reloadRoster,
    reloadGroups,
    reloadTeams,
    reloadMatches,
  };
}
