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

export function computeTopScorers(
  teams: StandingsTeamInput[],
  matches: ScorerMatchInput[],
): TopScorerRow[] {
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
  return Array.from(tally.values()).sort(
    (a, b) => b.goals - a.goals || a.fullName.localeCompare(b.fullName, "ar"),
  );
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
  excludeMatchId?: string,
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

export function computeStats(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[],
): TournamentStats {
  const played = matches.filter(
    (m) => m.status === "PLAYED" && m.homeScore !== null && m.awayScore !== null,
  );
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

  // Patch up any team still short (only possible with an odd team count).
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
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: string;
}

// Returns the winning team's id, or null if the match hasn't been played yet
// or ended in a draw that wasn't resolved by a penalty shootout.
export function getMatchWinnerTeamId(m: BracketMatchInput): string | null {
  if (m.status !== "PLAYED" || m.homeScore === null || m.awayScore === null) return null;
  if (m.homeScore > m.awayScore) return m.homeTeamId;
  if (m.awayScore > m.homeScore) return m.awayTeamId;
  if (m.homePenalties !== null && m.awayPenalties !== null && m.homePenalties !== m.awayPenalties) {
    return m.homePenalties > m.awayPenalties ? m.homeTeamId : m.awayTeamId;
  }
  return null;
}

// Human label for a knockout round, derived from how many matches it has
// (i.e. how many participants remain) rather than a round index — works
// the same whether the bracket started at 16, 8, 4 or 2 participants.
// A knockout bracket only works when every round halves cleanly.
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

// The app has no per-user timezone setting, so match times are always
// entered/displayed in the club's local timezone (Morocco, fixed UTC+1 —
// no DST since 2018).
export const CLUB_TIMEZONE = "Africa/Casablanca";

// <input type="datetime-local"> values (YYYY-MM-DDTHH:mm[:ss]) carry no
// timezone — interpret them as club-local time rather than the server's.
// Anything else (already-ISO with Z/offset, or a bare YYYY-MM-DD date) is
// parsed as-is.
export function parseMatchDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const withSeconds = value.length === 16 ? `${value}:00` : value;
    return new Date(`${withSeconds}+01:00`);
  }
  return new Date(value);
}

// Inverse of parseMatchDate — populates a <input type="datetime-local">
// field with the club-local (UTC+1, no DST) representation of a stored date.
export function matchDateToLocalInput(date: string | Date): string {
  const local = new Date(new Date(date).getTime() + 60 * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

// Same shape as formatDateTime, but a kickoff belongs to the club's day
// rather than the reader's, so the parts come from a zoned formatter and are
// reassembled instead of read off a Date.
export function formatMatchDateTime(date: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLUB_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(date));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")}`;
}

export function formatMatchTime(date: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLUB_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(date));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")}`;
}

// Club-local (YYYY-MM-DD) calendar day for a match date — used to find
// "today"'s matches regardless of where the code happens to run.
export function matchDateKey(date: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLUB_TIMEZONE }).format(new Date(date));
}

export function todayClubDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLUB_TIMEZONE }).format(new Date());
}

// A non-knockout ("league") match must stay within a single group — pairing
// teams from two different groups is how a match ends up silently dropped
// from both groups' standings (computeStandings only counts a match if both
// teams are in the pool it was given). Groupless teams/tournaments are fine.
export function isValidLeaguePairing(
  isKnockout: boolean,
  homeGroupId: string | null,
  awayGroupId: string | null,
): boolean {
  if (isKnockout) return true;
  if (homeGroupId === null || awayGroupId === null) return true;
  return homeGroupId === awayGroupId;
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
  homeTeam: { id: string };
  awayTeam: { id: string };
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

// "Best defense" ranking by matches played without conceding — the data
// model has no player position, so this is a team stat, not a per-goalkeeper one.
export function computeCleanSheets(
  teams: StandingsTeamInput[],
  matches: CleanSheetMatchInput[],
): CleanSheetRow[] {
  const table = new Map<string, CleanSheetRow>();
  for (const t of teams) table.set(t.id, { teamId: t.id, name: t.name, played: 0, cleanSheets: 0 });
  for (const m of matches) {
    if (m.status !== "PLAYED" || m.homeScore === null || m.awayScore === null) continue;
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
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  order: number;
}

export interface TeamAdvancedRow {
  teamId: string;
  name: string;
  biggestWin: { opponent: string; score: string; gd: number } | null;
  unbeatenStreak: number;
  form: ("W" | "D" | "L")[];
}

export function computeTeamAdvancedStats(
  teams: StandingsTeamInput[],
  matches: TeamMatchInput[],
): TeamAdvancedRow[] {
  const played = matches
    .filter((m) => m.status === "PLAYED" && m.homeScore !== null && m.awayScore !== null)
    .sort((a, b) => a.order - b.order);

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
          score: `${gf}-${ga}`,
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
