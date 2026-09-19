export const YELLOW_POINTS = 1;
export const RED_POINTS = 3;

export interface StandingsTeamInput {
  id: string;
  name: string;
  groupId?: string | null;
  logo?: string | null;
  photo?: string | null;
  disabledAt?: Date | string | null;
}

export interface StandingsBookingInput {
  teamId: string;
  cardType: string;
}

export interface StandingsGoalInput {
  teamId: string;
  count: number;
}

export interface StandingsMatchInput {
  firstTeam: { id: string } | null;
  secondTeam: { id: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  series?: { sideATotal: number; sideBTotal: number; over: boolean } | null;
  status: string;
  isKnockout: boolean;
  bookings?: StandingsBookingInput[];
  forfeitWinnerTeamId?: string | null;
  goals?: StandingsGoalInput[];
}

export const WIN_POINTS = 3;
export const DRAW_POINTS = 1;

function scoredIn(m: StandingsMatchInput): { a: number; b: number } | null {
  if (m.series !== undefined && m.series !== null) {
    return m.series.over ? { a: m.series.sideATotal, b: m.series.sideBTotal } : null;
  }
  if (m.homeScore === null || m.awayScore === null) return null;
  return { a: m.homeScore, b: m.awayScore };
}

function pointsFor(scored: { a: number; b: number }, series: boolean): { a: number; b: number } {
  if (series) return { a: scored.a, b: scored.b };
  if (scored.a > scored.b) return { a: WIN_POINTS, b: 0 };
  if (scored.b > scored.a) return { a: 0, b: WIN_POINTS };
  return { a: DRAW_POINTS, b: DRAW_POINTS };
}

interface SideScore {
  scored: number;
  conceded: number;
}

export interface StandingsRow {
  teamId: string;
  name: string;
  logo: string | null;
  photo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scoredFor: number;
  scoredAgainst: number;
  difference: number;
  points: number;
  cardPoints: number;
  unresolved: boolean;
  disabled: boolean;
}

function blank(team: StandingsTeamInput): StandingsRow {
  return {
    teamId: team.id,
    name: team.name,
    logo: team.logo ?? null,
    photo: team.photo ?? null,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    scoredFor: 0,
    scoredAgainst: 0,
    difference: 0,
    points: 0,
    cardPoints: 0,
    unresolved: false,
    disabled: team.disabledAt != null,
  };
}

function sides(m: StandingsMatchInput): { homeId: string; awayId: string } | null {
  if (!m.firstTeam || !m.secondTeam) return null;
  return { homeId: m.firstTeam.id, awayId: m.secondTeam.id };
}

function goalsBy(m: StandingsMatchInput, teamId: string): number {
  return (m.goals ?? []).reduce((all, g) => (g.teamId === teamId ? all + g.count : all), 0);
}

function awardPadsTheScore(m: StandingsMatchInput): boolean {
  return m.goals !== undefined && !m.series && !!m.forfeitWinnerTeamId;
}

function tallied(
  m: StandingsMatchInput,
  scored: { a: number; b: number },
  pair: { homeId: string; awayId: string },
): { home: SideScore; away: SideScore } {
  const home = { scored: scored.a, conceded: scored.b };
  const away = { scored: scored.b, conceded: scored.a };
  if (awardPadsTheScore(m)) {
    if (m.forfeitWinnerTeamId === pair.homeId) home.scored = goalsBy(m, pair.homeId);
    else if (m.forfeitWinnerTeamId === pair.awayId) away.scored = goalsBy(m, pair.awayId);
  }
  return { home, away };
}

function counted(row: StandingsRow, opponent: StandingsRow): boolean {
  return row.disabled || !opponent.disabled;
}

function counts(matches: StandingsMatchInput[]): boolean[] {
  return matches.map((m) => !m.isKnockout && m.status === "PLAYED" && scoredIn(m) !== null);
}

function tally(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[],
  series: boolean,
): StandingsRow[] {
  const table = new Map(teams.map((t) => [t.id, blank(t)]));
  const played = counts(matches);

  matches.forEach((m, i) => {
    if (!played[i]) return;
    const pair = sides(m);
    const scored = scoredIn(m);
    if (!pair || !scored) return;
    const home = table.get(pair.homeId);
    const away = table.get(pair.awayId);
    if (!home || !away) return;
    const takeHome = counted(home, away);
    const takeAway = counted(away, home);
    const gained = pointsFor(scored, series);
    const goals = tallied(m, scored, pair);
    if (takeHome) {
      home.played++;
      home.scoredFor += goals.home.scored;
      home.scoredAgainst += goals.home.conceded;
      home.points += gained.a;
      if (scored.a > scored.b) home.won++;
      else if (scored.a < scored.b) home.lost++;
      else home.drawn++;
    }
    if (takeAway) {
      away.played++;
      away.scoredFor += goals.away.scored;
      away.scoredAgainst += goals.away.conceded;
      away.points += gained.b;
      if (scored.b > scored.a) away.won++;
      else if (scored.b < scored.a) away.lost++;
      else away.drawn++;
    }
    for (const booking of m.bookings ?? []) {
      const row = table.get(booking.teamId);
      if (!row) continue;
      const take = row === home ? takeHome : row === away ? takeAway : false;
      if (take) row.cardPoints += booking.cardType === "RED" ? RED_POINTS : YELLOW_POINTS;
    }
  });

  return [...table.values()].map((r) => ({
    ...r,
    difference: r.scoredFor - r.scoredAgainst,
  }));
}

function headToHead(
  rows: StandingsRow[],
  matches: StandingsMatchInput[],
  series: boolean,
): Map<string, number[]> {
  const ids = new Set(rows.map((r) => r.teamId));
  const mini = new Map(rows.map((r) => [r.teamId, { points: 0, scoredFor: 0, scoredAgainst: 0 }]));
  const played = counts(matches);

  matches.forEach((m, i) => {
    if (!played[i]) return;
    const pair = sides(m);
    const scored = scoredIn(m);
    if (!pair || !scored) return;
    if (!ids.has(pair.homeId) || !ids.has(pair.awayId)) return;
    const home = mini.get(pair.homeId)!;
    const away = mini.get(pair.awayId)!;
    const goals = tallied(m, scored, pair);
    home.scoredFor += goals.home.scored;
    home.scoredAgainst += goals.home.conceded;
    away.scoredFor += goals.away.scored;
    away.scoredAgainst += goals.away.conceded;
    const gained = pointsFor(scored, series);
    home.points += gained.a;
    away.points += gained.b;
  });

  return new Map(
    [...mini.entries()].map(
      ([id, m]) =>
        [id, [m.points, m.scoredFor - m.scoredAgainst, m.scoredFor]] as [string, number[]],
    ),
  );
}

type Key = (row: StandingsRow) => number;

function split(rows: StandingsRow[], keys: Key[]): StandingsRow[][] {
  const blocks: StandingsRow[][] = [];
  for (const row of rows) {
    const last = blocks[blocks.length - 1];
    if (last && keys.every((key) => key(last[0]) === key(row))) last.push(row);
    else blocks.push([row]);
  }
  return blocks;
}

function byKeys(rows: StandingsRow[], keys: Key[]): StandingsRow[] {
  return [...rows].sort((a, b) => {
    for (const key of keys) {
      const diff = key(b) - key(a);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

const OVERALL_KEYS: Key[] = [(r) => r.difference, (r) => r.scoredFor, (r) => -r.cardPoints];

function rank(
  rows: StandingsRow[],
  matches: StandingsMatchInput[],
  series: boolean,
): StandingsRow[] {
  if (rows.length < 2) return rows;

  const h2h = headToHead(rows, matches, series);
  const keys = [0, 1, 2].map(
    (i): Key =>
      (row) =>
        h2h.get(row.teamId)![i],
  );
  const blocks = split(byKeys(rows, keys), keys);
  if (blocks.length === 1) return byOverall(rows, matches, series);
  return blocks.flatMap((block) => rank(block, matches, series));
}

function byOverall(
  rows: StandingsRow[],
  matches: StandingsMatchInput[],
  series: boolean,
): StandingsRow[] {
  const blocks = split(byKeys(rows, OVERALL_KEYS), OVERALL_KEYS);
  if (blocks.length === 1) return rows.map((row) => ({ ...row, unresolved: true }));
  return blocks.flatMap((block) => rank(block, matches, series));
}

function ordered(
  rows: StandingsRow[],
  matches: StandingsMatchInput[],
  series: boolean,
): StandingsRow[] {
  const sorted = [...rows].sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name, "ar"),
  );
  return split(sorted, [(r) => r.points]).flatMap((block) => rank(block, matches, series));
}

export function computeStandings(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[],
  series = false,
): StandingsRow[] {
  const rows = tally(teams, matches, series);
  return [
    ...ordered(
      rows.filter((r) => !r.disabled),
      matches,
      series,
    ),
    ...ordered(
      rows.filter((r) => r.disabled),
      matches,
      series,
    ),
  ];
}

export function groupStandings(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[],
  groupOrder?: string[],
  series = false,
): { groupId: string | null; teams: StandingsTeamInput[]; standings: StandingsRow[] }[] {
  const byGroup = new Map<string | null, StandingsTeamInput[]>();
  for (const t of teams) {
    const key = t.groupId ?? null;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(t);
  }
  const order = (groupId: string | null) => {
    if (groupId === null) return Number.MAX_SAFE_INTEGER;
    const i = groupOrder?.indexOf(groupId) ?? -1;
    return i === -1 ? Number.MAX_SAFE_INTEGER - 1 : i;
  };
  return [...byGroup.entries()]
    .sort(([a], [b]) => order(a) - order(b))
    .map(([groupId, groupTeams]) => ({
      groupId,
      teams: groupTeams,
      standings: computeStandings(groupTeams, matches, series),
    }));
}
