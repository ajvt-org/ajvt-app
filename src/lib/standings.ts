export interface StandingsTeamInput {
  id: string;
  name: string;
  groupId?: string | null;
  logo?: string | null;
}

export interface StandingsMatchInput {
  homeTeam: { id: string };
  awayTeam: { id: string };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isKnockout: boolean;
}

export interface StandingsRow {
  teamId: string;
  name: string;
  logo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export function computeStandings(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[],
): StandingsRow[] {
  const table = new Map<string, StandingsRow>();
  for (const t of teams) {
    table.set(t.id, {
      teamId: t.id,
      name: t.name,
      logo: t.logo ?? null,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    });
  }
  for (const m of matches) {
    if (m.isKnockout) continue;
    if (m.status !== "PLAYED" || m.homeScore === null || m.awayScore === null) continue;
    const home = table.get(m.homeTeam.id);
    const away = table.get(m.awayTeam.id);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.won++;
      away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
    }
  }
  return Array.from(table.values())
    .map((r) => ({ ...r, gd: r.gf - r.ga, points: r.won * 3 + r.drawn }))
    .sort(
      (a, b) =>
        b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name, "ar"),
    );
}

export function groupStandings(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[],
  groupOrder?: string[],
): { groupId: string | null; teams: StandingsTeamInput[]; standings: StandingsRow[] }[] {
  const byGroup = new Map<string | null, StandingsTeamInput[]>();
  for (const t of teams) {
    const key = t.groupId ?? null;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(t);
  }
  const rank = (groupId: string | null) => {
    if (groupId === null) return Number.MAX_SAFE_INTEGER;
    const i = groupOrder?.indexOf(groupId) ?? -1;
    return i === -1 ? Number.MAX_SAFE_INTEGER - 1 : i;
  };
  return Array.from(byGroup.entries())
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([groupId, groupTeams]) => ({
      groupId,
      teams: groupTeams,
      standings: computeStandings(groupTeams, matches),
    }));
}
