"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { tournamentWorkspace as texts } from "@/lib/texts";
import { DEFAULT_MVP_VOTE_MINUTES } from "@/lib/mvpVote";
import type {
  DisciplineRules,
  Group,
  Match,
  RosterMember,
  Suspension,
  Team,
  TournamentFormat,
} from "./types";

export interface TournamentInfo {
  id: string;
  title: string;
  photo: string | null;
  isTournament: boolean;
  format: TournamentFormat;
  profile: "FOOTBALL" | "BOARD";
  minTeamSize: number | null;
  maxTeamSize: number | null;
  organisedByTaguilalett: boolean;
  outsidePlayerLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
}

export function useTournamentData(activityId: string, enabled = true) {
  const router = useRouter();
  const [info, setInfo] = useState<TournamentInfo | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [mvpVoteMinutes, setMvpVoteMinutes] = useState(DEFAULT_MVP_VOTE_MINUTES);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [rules, setRules] = useState<DisciplineRules | null>(null);
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
    () =>
      load("matches", (d: { matches: Match[]; mvpVoteMinutes?: number }) => {
        setMatches(d.matches || []);
        if (d.mvpVoteMinutes) setMvpVoteMinutes(d.mvpVoteMinutes);
      }),
    [load],
  );
  const reloadDiscipline = useCallback(
    () =>
      load("suspensions", (d: { suspensions: Suspension[]; rules: DisciplineRules }) => {
        setSuspensions(d.suspensions || []);
        setRules(d.rules || null);
      }),
    [load],
  );

  useEffect(() => {
    if (!enabled) return;
    Promise.all([
      reloadInfo(),
      reloadRoster(),
      reloadGroups(),
      reloadTeams(),
      reloadMatches(),
      reloadDiscipline(),
    ])
      .catch(() => setError(texts.loadFailed))
      .finally(() => setLoading(false));
  }, [
    enabled,
    reloadInfo,
    reloadRoster,
    reloadGroups,
    reloadTeams,
    reloadMatches,
    reloadDiscipline,
  ]);

  return {
    info,
    roster,
    groups,
    teams,
    matches,
    mvpVoteMinutes,
    suspensions,
    rules,
    loading,
    error,
    reloadInfo,
    reloadRoster,
    reloadGroups,
    reloadTeams,
    reloadMatches,
    reloadDiscipline,
  };
}
