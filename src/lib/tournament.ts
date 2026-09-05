import { countsForScorers } from "./forfeit";
import type { StandingsTeamInput, StandingsMatchInput } from "./standings";
export interface ScorerGoalInput {
  teamId: string;
  count: number;
  kind?: "GOAL" | "PENALTY" | "OWN_GOAL";
  member: { id: string; fullName: string; photo?: string | null } | null;
}

export interface ScorerMatchInput {
  goals: ScorerGoalInput[];
  forfeitWinnerTeamId?: string | null;
}

export interface TopScorerRow {
  memberId: string;
  fullName: string;
  photo: string | null;
  teamName: string;
  goals: number;
}

export function computeTopScorers(
  teams: StandingsTeamInput[],
  matches: ScorerMatchInput[],
): TopScorerRow[] {
  const tally = new Map<string, TopScorerRow>();
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  for (const m of matches) {
    for (const g of m.goals) {
      if (g.member === null || g.kind === "OWN_GOAL") continue;
      if (!countsForScorers(g, m.forfeitWinnerTeamId)) continue;
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
  return Array.from(tally.values()).sort(
    (a, b) => b.goals - a.goals || a.fullName.localeCompare(b.fullName, "ar"),
  );
}

export interface HeadToHeadMatchInput {
  id: string;
  homeTeam: { id: string } | null;
  awayTeam: { id: string } | null;
}

export function getHeadToHead<T extends HeadToHeadMatchInput>(
  matches: T[],
  teamAId: string,
  teamBId: string,
  excludeMatchId?: string,
): T[] {
  return matches.filter((m) => {
    if (m.id === excludeMatchId) return false;
    if (!m.homeTeam || !m.awayTeam) return false;
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

export function computeStats(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[],
): TournamentStats {
  const played = matches
    .filter(
      (m) =>
        m.status === "PLAYED" &&
        m.homeScore !== null &&
        m.awayScore !== null &&
        m.homeTeam !== null &&
        m.awayTeam !== null,
    )
    .map((m) => ({ ...m, homeTeam: m.homeTeam!, awayTeam: m.awayTeam! }));
  const matchesPlayed = played.length;
  const totalGoals = played.reduce((sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0);

  const tally = new Map(
    teams.map((t) => [t.id, { teamId: t.id, name: t.name, played: 0, gf: 0, ga: 0 }]),
  );
  for (const m of played) {
    const home = tally.get(m.homeTeam.id);
    const away = tally.get(m.awayTeam.id);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.gf += m.homeScore!;
    home.ga += m.awayScore!;
    away.gf += m.awayScore!;
    away.ga += m.homeScore!;
  }
  const playedTeams = Array.from(tally.values()).filter((r) => r.played > 0);

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
    bestAttack: bestAttack
      ? { teamId: bestAttack.teamId, name: bestAttack.name, gf: bestAttack.gf }
      : null,
    bestDefense: bestDefense
      ? { teamId: bestDefense.teamId, name: bestDefense.name, ga: bestDefense.ga }
      : null,
  };
}

export function drawKnockoutPairs<T extends { id: string; groupId?: string | null }>(
  shuffled: T[],
): [T, T][] | null {
  function solve(remaining: T[]): [T, T][] | null {
    if (remaining.length === 0) return [];
    const [first, ...rest] = remaining;
    for (let i = 0; i < rest.length; i++) {
      const partner = rest[i];
      if (first.groupId != null && partner.groupId === first.groupId) continue;
      const sub = solve(rest.filter((_, j) => j !== i));
      if (sub) return [[first, partner], ...sub];
    }
    return null;
  }
  return solve(shuffled);
}

export interface GeneratedFixture {
  round: number;
  homeTeamId: string;
  awayTeamId: string;
}

function circleMethodRounds(teamIds: string[]): [string | null, string | null][][] {
  const arr: (string | null)[] = [...teamIds];
  if (arr.length % 2 !== 0) arr.push(null);
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

export function generateMatchSchedule(
  teamIds: string[],
  targetPerTeam = 3,
  existingCounts: Map<string, number> = new Map(),
  existingPairs: Set<string> = new Set(),
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

  let short = teamIds.filter((id) => (counts.get(id) || 0) < targetPerTeam);
  let guard = 0;
  while (short.length > 0 && guard < 50) {
    guard++;
    short.sort((a, b) => (counts.get(a) || 0) - (counts.get(b) || 0));
    const a = short[0];
    const freshPartner = short.slice(1).find((t) => !played.has(key(a, t)));
    const b =
      freshPartner ||
      short[1] ||
      teamIds.find((t) => t !== a && !played.has(key(a, t))) ||
      teamIds.find((t) => t !== a);
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

export interface BracketMatchInput {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: string;
}

export function getMatchWinnerTeamId(m: BracketMatchInput): string | null {
  if (m.status !== "PLAYED") return null;
  if (m.homeTeamId === null || m.awayTeamId === null) return m.homeTeamId ?? m.awayTeamId;
  if (m.homeScore === null || m.awayScore === null) return null;
  if (m.homeScore > m.awayScore) return m.homeTeamId;
  if (m.awayScore > m.homeScore) return m.awayTeamId;
  if (m.homePenalties !== null && m.awayPenalties !== null && m.homePenalties !== m.awayPenalties) {
    return m.homePenalties > m.awayPenalties ? m.homeTeamId : m.awayTeamId;
  }
  return null;
}

export function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

export function bracketRoundLabel(matchCount: number): string {
  if (matchCount === 1) return "النهائي";
  if (matchCount === 2) return "نصف النهائي";
  if (matchCount === 4) return "ربع النهائي";
  if (matchCount >= 8 && Number.isInteger(Math.log2(matchCount))) return `دور الـ${matchCount * 2}`;
  return `الدور الإقصائي`;
}

export function isValidLeaguePairing(
  isKnockout: boolean,
  homeGroupId: string | null,
  awayGroupId: string | null,
): boolean {
  if (isKnockout) return true;
  if (homeGroupId === null || awayGroupId === null) return true;
  return homeGroupId === awayGroupId;
}

export function knockoutToggleAllowed(
  isKnockout: boolean,
  bracketRound: number | null,
  homeGroupId: string | null,
  awayGroupId: string | null,
): boolean {
  if (isKnockout || bracketRound !== null) return true;
  return homeGroupId === null || awayGroupId === null;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface BookingInput {
  teamId: string;
  cardType: string;
  member: { id: string; fullName: string; photo?: string | null };
}

export interface DisciplineMatchInput {
  bookings: BookingInput[];
}

export interface DisciplineRow {
  memberId: string;
  fullName: string;
  photo: string | null;
  teamName: string;
  yellow: number;
  red: number;
}

export function computeDisciplineStats(
  teams: StandingsTeamInput[],
  matches: DisciplineMatchInput[],
): DisciplineRow[] {
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  const tally = new Map<string, DisciplineRow>();
  for (const m of matches) {
    for (const b of m.bookings) {
      let row = tally.get(b.member.id);
      if (!row) {
        row = {
          memberId: b.member.id,
          fullName: b.member.fullName,
          photo: b.member.photo ?? null,
          teamName: teamNameById.get(b.teamId) || "—",
          yellow: 0,
          red: 0,
        };
        tally.set(b.member.id, row);
      }
      if (b.cardType === "RED") row.red++;
      else row.yellow++;
    }
  }
  return Array.from(tally.values()).sort(
    (a, b) => b.red - a.red || b.yellow - a.yellow || a.fullName.localeCompare(b.fullName, "ar"),
  );
}

export interface CleanSheetMatchInput {
  homeTeam: { id: string } | null;
  awayTeam: { id: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

export interface CleanSheetRow {
  teamId: string;
  name: string;
  played: number;
  cleanSheets: number;
}

export function computeCleanSheets(
  teams: StandingsTeamInput[],
  matches: CleanSheetMatchInput[],
): CleanSheetRow[] {
  const table = new Map<string, CleanSheetRow>();
  for (const t of teams) table.set(t.id, { teamId: t.id, name: t.name, played: 0, cleanSheets: 0 });
  for (const m of matches) {
    if (m.status !== "PLAYED" || m.homeScore === null || m.awayScore === null) continue;
    if (!m.homeTeam || !m.awayTeam) continue;
    const home = table.get(m.homeTeam.id);
    const away = table.get(m.awayTeam.id);
    if (home) {
      home.played++;
      if (m.awayScore === 0) home.cleanSheets++;
    }
    if (away) {
      away.played++;
      if (m.homeScore === 0) away.cleanSheets++;
    }
  }
  return Array.from(table.values())
    .filter((r) => r.played > 0)
    .sort((a, b) => b.cleanSheets - a.cleanSheets || a.name.localeCompare(b.name, "ar"));
}

export interface TeamRosterInput {
  id: string;
  name: string;
  members: { member: { id: string } }[];
}

export interface MotmMatchInput {
  manOfTheMatch: { id: string; fullName: string; photo?: string | null } | null;
}

export interface MotmRow {
  memberId: string;
  fullName: string;
  photo: string | null;
  teamName: string;
  count: number;
}

export function computeMotmLeaders(teams: TeamRosterInput[], matches: MotmMatchInput[]): MotmRow[] {
  const teamNameByMemberId = new Map<string, string>();
  for (const t of teams) {
    for (const tm of t.members) teamNameByMemberId.set(tm.member.id, t.name);
  }
  const tally = new Map<string, MotmRow>();
  for (const m of matches) {
    if (!m.manOfTheMatch) continue;
    const id = m.manOfTheMatch.id;
    let row = tally.get(id);
    if (!row) {
      row = {
        memberId: id,
        fullName: m.manOfTheMatch.fullName,
        photo: m.manOfTheMatch.photo ?? null,
        teamName: teamNameByMemberId.get(id) || "—",
        count: 0,
      };
      tally.set(id, row);
    }
    row.count++;
  }
  return Array.from(tally.values()).sort(
    (a, b) => b.count - a.count || a.fullName.localeCompare(b.fullName, "ar"),
  );
}

export interface TeamMatchInput {
  homeTeam: { id: string; name: string } | null;
  awayTeam: { id: string; name: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  order: number;
}

export interface TeamAdvancedRow {
  teamId: string;
  name: string;
  biggestWin: { opponent: string; gf: number; ga: number; gd: number } | null;
  unbeatenStreak: number;
  form: ("W" | "D" | "L")[];
}

export function computeTeamAdvancedStats(
  teams: StandingsTeamInput[],
  matches: TeamMatchInput[],
): TeamAdvancedRow[] {
  const played = matches
    .filter(
      (m) =>
        m.status === "PLAYED" &&
        m.homeScore !== null &&
        m.awayScore !== null &&
        m.homeTeam !== null &&
        m.awayTeam !== null,
    )
    .sort((a, b) => a.order - b.order)
    .map((m) => ({ ...m, homeTeam: m.homeTeam!, awayTeam: m.awayTeam! }));

  return teams.map((t) => {
    const teamMatches = played.filter((m) => m.homeTeam.id === t.id || m.awayTeam.id === t.id);

    let biggestWin: TeamAdvancedRow["biggestWin"] = null;
    for (const m of teamMatches) {
      const isHome = m.homeTeam.id === t.id;
      const gf = (isHome ? m.homeScore : m.awayScore) as number;
      const ga = (isHome ? m.awayScore : m.homeScore) as number;
      if (gf <= ga) continue;
      const gd = gf - ga;
      if (!biggestWin || gd > biggestWin.gd) {
        biggestWin = {
          opponent: isHome ? m.awayTeam.name : m.homeTeam.name,
          gf,
          ga,
          gd,
        };
      }
    }

    let unbeatenStreak = 0;
    for (let i = teamMatches.length - 1; i >= 0; i--) {
      const m = teamMatches[i];
      const isHome = m.homeTeam.id === t.id;
      const gf = (isHome ? m.homeScore : m.awayScore) as number;
      const ga = (isHome ? m.awayScore : m.homeScore) as number;
      if (gf < ga) break;
      unbeatenStreak++;
    }

    const form: ("W" | "D" | "L")[] = teamMatches.slice(-5).map((m) => {
      const isHome = m.homeTeam.id === t.id;
      const gf = (isHome ? m.homeScore : m.awayScore) as number;
      const ga = (isHome ? m.awayScore : m.homeScore) as number;
      return gf > ga ? "W" : gf < ga ? "L" : "D";
    });

    return { teamId: t.id, name: t.name, biggestWin, unbeatenStreak, form };
  });
}
