import { matchesSearch, searchTokens } from "@/lib/arabicText";

export interface TeamNames {
  name: string;
  players: string[];
}

export function teamMatches(team: TeamNames, tokens: string[]): boolean {
  return (
    matchesSearch(team.name, tokens) || team.players.some((player) => matchesSearch(player, tokens))
  );
}

export function matchingTeams<T extends TeamNames>(teams: T[], query: string): T[] {
  const tokens = searchTokens(query);
  return tokens.length ? teams.filter((team) => teamMatches(team, tokens)) : teams;
}

export function matchingPeople<T extends { fullName: string }>(people: T[], query: string): T[] {
  const tokens = searchTokens(query);
  return tokens.length ? people.filter((p) => matchesSearch(p.fullName, tokens)) : people;
}

export function matchingMembers<T extends { member: { fullName: string } }>(
  members: T[],
  query: string,
): T[] {
  const tokens = searchTokens(query);
  if (!tokens.length) return members;
  const hits = members.filter((m) => matchesSearch(m.member.fullName, tokens));
  return hits.length ? hits : members;
}
