export const YELLOW_POINTS = 1;
export const RED_POINTS = 3;

export interface StandingsTeamInput {
  id: string;
  name: string;
  groupId?: string | null;
  logo?: string | null;
  photo?: string | null;
}

export interface StandingsBookingInput {
  teamId: string;
  cardType: string;
}

export interface StandingsMatchInput {
  homeTeam: { id: string } | null;
  awayTeam: { id: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isKnockout: boolean;
  bookings?: StandingsBookingInput[];
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
  gf: number;
  ga: number;
  gd: number;
  points: number;
  cardPoints: number;
  unresolved: boolean;
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
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    cardPoints: 0,
    unresolved: false,
  };
}

function sides(m: StandingsMatchInput): { homeId: string; awayId: string } | null {
  if (!m.homeTeam || !m.awayTeam) return null;
  return { homeId: m.homeTeam.id, awayId: m.awayTeam.id };
}

function counts(matches: StandingsMatchInput[]): boolean[] {
  return matches.map(
    (m) => !m.isKnockout && m.status === "PLAYED" && m.homeScore !== null && m.awayScore !== null,
  );
}

function tally(teams: StandingsTeamInput[], matches: StandingsMatchInput[]): StandingsRow[] {
  const table = new Map(teams.map((t) => [t.id, blank(t)]));
  const played = counts(matches);

  matches.forEach((m, i) => {
    if (!played[i]) return;
    const pair = sides(m);
    if (!pair) return;
    const home = table.get(pair.homeId);
    const away = table.get(pair.awayId);
    if (!home || !away) return;
    home.played++;
    away.played++;
    home.gf += m.homeScore!;
    home.ga += m.awayScore!;
    away.gf += m.awayScore!;
    away.ga += m.homeScore!;
    if (m.homeScore! > m.awayScore!) {
      home.won++;
      away.lost++;
    } else if (m.homeScore! < m.awayScore!) {
      away.won++;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
    }
    for (const booking of m.bookings ?? []) {
      const row = table.get(booking.teamId);
      if (row) row.cardPoints += booking.cardType === "RED" ? RED_POINTS : YELLOW_POINTS;
    }
  });

  return [...table.values()].map((r) => ({
    ...r,
    gd: r.gf - r.ga,
    points: r.won * 3 + r.drawn,
  }));
}

function headToHead(rows: StandingsRow[], matches: StandingsMatchInput[]): Map<string, number[]> {
  const ids = new Set(rows.map((r) => r.teamId));
  const mini = new Map(rows.map((r) => [r.teamId, { points: 0, gf: 0, ga: 0 }]));
  const played = counts(matches);

  matches.forEach((m, i) => {
    if (!played[i]) return;
    const pair = sides(m);
    if (!pair) return;
    if (!ids.has(pair.homeId) || !ids.has(pair.awayId)) return;
    const home = mini.get(pair.homeId)!;
    const away = mini.get(pair.awayId)!;
    home.gf += m.homeScore!;
    home.ga += m.awayScore!;
    away.gf += m.awayScore!;
    away.ga += m.homeScore!;
    if (m.homeScore! > m.awayScore!) home.points += 3;
    else if (m.homeScore! < m.awayScore!) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  });

  return new Map(
    [...mini.entries()].map(([id, m]) => [id, [m.points, m.gf - m.ga, m.gf]] as [string, number[]]),
  );
}

type Key = (row: StandingsRow) => number;

function split(rows: StandingsRow[], key: Key): StandingsRow[][] {
  const blocks: StandingsRow[][] = [];
  for (const row of rows) {
    const last = blocks[blocks.length - 1];
    if (last && key(last[0]) === key(row)) last.push(row);
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

function rank(rows: StandingsRow[], matches: StandingsMatchInput[]): StandingsRow[] {
  if (rows.length < 2) return rows;

  const h2h = headToHead(rows, matches);
  const at =
    (i: number): Key =>
    (row) =>
      h2h.get(row.teamId)![i];

  const ordered = byKeys(rows, [
    at(0),
    at(1),
    at(2),
    (r) => r.gd,
    (r) => r.gf,
    (r) => -r.cardPoints,
  ]);

  const same = (a: StandingsRow, b: StandingsRow) =>
    [at(0), at(1), at(2), (r: StandingsRow) => r.gd, (r: StandingsRow) => r.gf].every(
      (key) => key(a) === key(b),
    ) && a.cardPoints === b.cardPoints;

  return ordered.map((row, i) => {
    const before = ordered[i - 1];
    const after = ordered[i + 1];
    const tied = (before && same(before, row)) || (after && same(after, row));
    return tied ? { ...row, unresolved: true } : row;
  });
}

export function computeStandings(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[],
): StandingsRow[] {
  const rows = tally(teams, matches).sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name, "ar"),
  );
  return split(rows, (r) => r.points).flatMap((block) => rank(block, matches));
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
      standings: computeStandings(groupTeams, matches),
    }));
}
