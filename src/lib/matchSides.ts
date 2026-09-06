import type { MatchShape } from "@prisma/client";
import { isFootball } from "./matchShape";

export interface SideIds {
  homeTeamId: string | null;
  awayTeamId: string | null;
  sideATeamId: string | null;
  sideBTeamId: string | null;
}

export interface SideTeams<T> {
  homeTeam: T;
  awayTeam: T;
  sideATeam: T;
  sideBTeam: T;
}

export interface Sides<T> {
  first: T;
  second: T;
}

export function matchSideIds(match: SideIds, shape: MatchShape): Sides<string | null> {
  return isFootball(shape)
    ? { first: match.homeTeamId, second: match.awayTeamId }
    : { first: match.sideATeamId, second: match.sideBTeamId };
}

export function matchSideTeams<T>(match: SideTeams<T>, shape: MatchShape): Sides<T> {
  return isFootball(shape)
    ? { first: match.homeTeam, second: match.awayTeam }
    : { first: match.sideATeam, second: match.sideBTeam };
}

export function sideIdData(
  shape: MatchShape,
  first: string | null,
  second: string | null,
): Partial<SideIds> {
  return isFootball(shape)
    ? { homeTeamId: first, awayTeamId: second }
    : { sideATeamId: first, sideBTeamId: second };
}

export function anySideIs(teamIds: string[]) {
  return {
    OR: [
      { homeTeamId: { in: teamIds } },
      { awayTeamId: { in: teamIds } },
      { sideATeamId: { in: teamIds } },
      { sideBTeamId: { in: teamIds } },
    ],
  };
}

export function bothSidesKnown(match: SideIds, shape: MatchShape): boolean {
  const sides = matchSideIds(match, shape);
  return sides.first !== null && sides.second !== null;
}

export function noSideKnown(match: SideIds, shape: MatchShape): boolean {
  const sides = matchSideIds(match, shape);
  return sides.first === null && sides.second === null;
}
