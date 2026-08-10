export interface StandingsTeamInput {
  id: string;
  name: string;
  groupId?: string | null;
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
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export function computeStandings(teams: StandingsTeamInput[], matches: StandingsMatchInput[]): StandingsRow[] {
  const table = new Map<string, StandingsRow>();
  for (const t of teams) {
    table.set(t.id, { teamId: t.id, name: t.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
  }
  for (const m of matches) {
    if (m.isKnockout) continue;
    if (m.status !== "PLAYED" || m.homeScore === null || m.awayScore === null) continue;
    const home = table.get(m.homeTeam.id);
    const away = table.get(m.awayTeam.id);
    if (!home || !away) continue;
    home.played++; away.played++;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;
    if (m.homeScore > m.awayScore) { home.won++; away.lost++; }
    else if (m.homeScore < m.awayScore) { away.won++; home.lost++; }
    else { home.drawn++; away.drawn++; }
  }
  return Array.from(table.values())
    .map((r) => ({ ...r, gd: r.gf - r.ga, points: r.won * 3 + r.drawn }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name, "ar"));
}

export function groupStandings(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[]
): { groupId: string | null; teams: StandingsTeamInput[]; standings: StandingsRow[] }[] {
  const byGroup = new Map<string | null, StandingsTeamInput[]>();
  for (const t of teams) {
    const key = t.groupId ?? null;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(t);
  }
  return Array.from(byGroup.entries()).map(([groupId, groupTeams]) => ({
    groupId,
    teams: groupTeams,
    standings: computeStandings(groupTeams, matches),
  }));
}

export interface ScorerGoalInput {
  teamId: string;
  count: number;
  member: { id: string; fullName: string; photo?: string | null };
}

export interface ScorerMatchInput {
  goals: ScorerGoalInput[];
}

export interface TopScorerRow {
  memberId: string;
  fullName: string;
  photo: string | null;
  teamName: string;
  goals: number;
}

export function computeTopScorers(teams: StandingsTeamInput[], matches: ScorerMatchInput[]): TopScorerRow[] {
  const tally = new Map<string, TopScorerRow>();
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  for (const m of matches) {
    for (const g of m.goals) {
      const existing = tally.get(g.member.id);
      if (existing) {
        existing.goals += g.count;
      } else {
        tally.set(g.member.id, {
          memberId: g.member.id,
          fullName: g.member.fullName,
          photo: g.member.photo ?? null,
          teamName: teamNameById.get(g.teamId) || "—",
          goals: g.count,
        });
      }
    }
  }
  return Array.from(tally.values()).sort((a, b) => b.goals - a.goals || a.fullName.localeCompare(b.fullName, "ar"));
}

export interface HeadToHeadMatchInput {
  id: string;
  homeTeam: { id: string };
  awayTeam: { id: string };
}

// Teams are recreated per tournament (Team belongs to a single Activity), so
// "past meetings" only ever spans matches within the same activity/tournament.
export function getHeadToHead<T extends HeadToHeadMatchInput>(
  matches: T[],
  teamAId: string,
  teamBId: string,
  excludeMatchId?: string
): T[] {
  return matches.filter((m) => {
    if (m.id === excludeMatchId) return false;
    const pair = new Set([m.homeTeam.id, m.awayTeam.id]);
    return pair.has(teamAId) && pair.has(teamBId) && teamAId !== teamBId;
  });
}

export interface TournamentStats {
  matchesPlayed: number;
  totalGoals: number;
  avgGoalsPerMatch: number;
  bestAttack: { teamId: string; name: string; gf: number } | null;
  bestDefense: { teamId: string; name: string; ga: number } | null;
}

export function computeStats(teams: StandingsTeamInput[], matches: StandingsMatchInput[]): TournamentStats {
  const standings = computeStandings(teams, matches);
  const playedTeams = standings.filter((r) => r.played > 0);
  const matchesPlayed = matches.filter((m) => m.status === "PLAYED" && m.homeScore !== null && m.awayScore !== null).length;
  const totalGoals = matches.reduce((sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0);

  const bestAttack = playedTeams.length
    ? playedTeams.reduce((best, r) => (r.gf > best.gf ? r : best))
    : null;
  const bestDefense = playedTeams.length
    ? playedTeams.reduce((best, r) => (r.ga < best.ga ? r : best))
    : null;

  return {
    matchesPlayed,
    totalGoals,
    avgGoalsPerMatch: matchesPlayed > 0 ? Math.round((totalGoals / matchesPlayed) * 100) / 100 : 0,
    bestAttack: bestAttack ? { teamId: bestAttack.teamId, name: bestAttack.name, gf: bestAttack.gf } : null,
    bestDefense: bestDefense ? { teamId: bestDefense.teamId, name: bestDefense.name, ga: bestDefense.ga } : null,
  };
}

export interface GeneratedFixture {
  round: number;
  homeTeamId: string;
  awayTeamId: string;
}

// Standard "circle method" round-robin: fix team[0], rotate the rest each
// round. Every pair meets exactly once across n-1 rounds (n even) — this
// guarantees each team plays exactly once per round, which is exactly what
// we want for "round 1 of every group happens together, then round 2, ...".
function circleMethodRounds(teamIds: string[]): [string | null, string | null][][] {
  const arr: (string | null)[] = [...teamIds];
  if (arr.length % 2 !== 0) arr.push(null); // null = bye
  const n = arr.length;
  const rounds: [string | null, string | null][][] = [];
  let current = arr.slice();
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string | null, string | null][] = [];
    for (let i = 0; i < n / 2; i++) {
      pairs.push([current[i], current[n - 1 - i]]);
    }
    rounds.push(pairs);
    current = [current[0], current[n - 1], ...current.slice(1, n - 1)];
  }
  return rounds;
}

// Builds a schedule where every team plays exactly `targetPerTeam` matches
// (3 by default), picking new opponents first and only repeating a pairing
// if there is no other way to bring a team up to the target — this only
// happens with an odd number of teams, where a perfectly even 3-a-side
// schedule is mathematically impossible (3 * odd number is odd, but every
// match hands out exactly 2 "match credits").
export function generateMatchSchedule(
  teamIds: string[],
  targetPerTeam = 3,
  existingCounts: Map<string, number> = new Map(),
  existingPairs: Set<string> = new Set()
): GeneratedFixture[] {
  if (teamIds.length < 2) return [];

  const key = (a: string, b: string) => [a, b].sort().join("|");
  const counts = new Map(teamIds.map((id) => [id, existingCounts.get(id) || 0]));
  const played = new Set(existingPairs);
  const fixtures: GeneratedFixture[] = [];
  let round = 1;

  const rounds = circleMethodRounds(teamIds);
  for (const pairs of rounds) {
    let usedThisRound = false;
    for (const [a, b] of pairs) {
      if (a === null || b === null) continue;
      if ((counts.get(a) || 0) >= targetPerTeam || (counts.get(b) || 0) >= targetPerTeam) continue;
      fixtures.push({ round, homeTeamId: a, awayTeamId: b });
      counts.set(a, (counts.get(a) || 0) + 1);
      counts.set(b, (counts.get(b) || 0) + 1);
      played.add(key(a, b));
      usedThisRound = true;
    }
    if (usedThisRound) round++;
  }

  // Patch up any team still short (only possible with an odd team count).
  let short = teamIds.filter((id) => (counts.get(id) || 0) < targetPerTeam);
  let guard = 0;
  while (short.length > 0 && guard < 50) {
    guard++;
    short.sort((a, b) => (counts.get(a) || 0) - (counts.get(b) || 0));
    const a = short[0];
    const freshPartner = short.slice(1).find((t) => !played.has(key(a, t)));
    const b = freshPartner || short[1] || teamIds.find((t) => t !== a && !played.has(key(a, t))) || teamIds.find((t) => t !== a);
    if (!b || a === b) break;
    fixtures.push({ round, homeTeamId: a, awayTeamId: b });
    counts.set(a, (counts.get(a) || 0) + 1);
    counts.set(b, (counts.get(b) || 0) + 1);
    played.add(key(a, b));
    round++;
    short = teamIds.filter((id) => (counts.get(id) || 0) < targetPerTeam);
  }

  return fixtures;
}
