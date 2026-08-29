export const DEFAULT_MVP_VOTE_MINUTES = 120;
export const MVP_VOTE_MINUTES_MIN = 1;
export const MVP_VOTE_MINUTES_MAX = 10080;

const MINUTE = 60_000;

export type VoteWindow = { status: "OPEN" | "CLOSED"; closesAt: Date | string };
export type CandidateTally = { memberId: string; votes: number };

export function validMinutes(value: unknown): boolean {
  const minutes = Number(value);
  return (
    Number.isInteger(minutes) && minutes >= MVP_VOTE_MINUTES_MIN && minutes <= MVP_VOTE_MINUTES_MAX
  );
}

export function closesAtFrom(openedAt: Date, minutes: number): Date {
  return new Date(openedAt.getTime() + minutes * MINUTE);
}

export function msLeft(closesAt: Date | string, now = new Date()): number {
  return Math.max(0, new Date(closesAt).getTime() - now.getTime());
}

export function isVoteClosed(vote: VoteWindow, now = new Date()): boolean {
  return vote.status === "CLOSED" || msLeft(vote.closesAt, now) === 0;
}

export function mvpWinner(candidates: CandidateTally[]): string | null {
  const best = Math.max(0, ...candidates.map((c) => c.votes));
  if (best === 0) return null;
  const leaders = candidates.filter((c) => c.votes === best);
  return leaders.length === 1 ? leaders[0].memberId : null;
}
