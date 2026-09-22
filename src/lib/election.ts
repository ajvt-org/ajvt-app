export const ELECTION_MINUTES_MIN = 1;
export const ELECTION_MINUTES_MAX = 10080;
export const DEFAULT_ELECTION_MINUTES = 1440;

const MINUTE = 60_000;

export type ElectionState = "upcoming" | "open" | "ended";

export type ElectionWindow = { startsAt: Date | string; durationMinutes: number };

export type ElectionTally = { candidateId: string | null; votes: number }[];

export function validElectionMinutes(value: unknown): boolean {
  const minutes = Number(value);
  return (
    Number.isInteger(minutes) && minutes >= ELECTION_MINUTES_MIN && minutes <= ELECTION_MINUTES_MAX
  );
}

export function endsAt(election: ElectionWindow): Date {
  return new Date(new Date(election.startsAt).getTime() + election.durationMinutes * MINUTE);
}

export function msUntilStart(election: ElectionWindow, now = new Date()): number {
  return Math.max(0, new Date(election.startsAt).getTime() - now.getTime());
}

export function msUntilEnd(election: ElectionWindow, now = new Date()): number {
  return Math.max(0, endsAt(election).getTime() - now.getTime());
}

export function electionState(election: ElectionWindow, now = new Date()): ElectionState {
  if (now.getTime() < new Date(election.startsAt).getTime()) return "upcoming";
  if (now.getTime() < endsAt(election).getTime()) return "open";
  return "ended";
}

export function leader(tally: ElectionTally): string | null {
  const named = tally.filter((row) => row.candidateId !== null);
  const best = Math.max(0, ...named.map((row) => row.votes));
  if (best === 0) return null;
  const leaders = named.filter((row) => row.votes === best);
  return leaders.length === 1 ? leaders[0].candidateId : null;
}
