import type { Prisma, PrismaClient } from "@prisma/client";
import { entrantKind, type EntrantKind } from "./entrant";
import { squadOf } from "./squadSize";

type Db = PrismaClient | Prisma.TransactionClient;

const SQUAD = { minTeamSize: true, maxTeamSize: true } as const;

export function entrantOf(activity: {
  minTeamSize: number | null;
  maxTeamSize: number | null;
}): EntrantKind {
  return entrantKind(squadOf(activity));
}

export async function entrantOfActivity(db: Db, activityId: string): Promise<EntrantKind> {
  const activity = await db.activity.findUnique({ where: { id: activityId }, select: SQUAD });
  return activity ? entrantOf(activity) : "team";
}

export async function entrantOfTeam(db: Db, teamId: string): Promise<EntrantKind> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { activity: { select: SQUAD } },
  });
  return team ? entrantOf(team.activity) : "team";
}

export async function entrantOfGroup(db: Db, groupId: string): Promise<EntrantKind> {
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { activity: { select: SQUAD } },
  });
  return group ? entrantOf(group.activity) : "team";
}

export async function entrantOfMatch(db: Db, matchId: string): Promise<EntrantKind> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { activity: { select: SQUAD } },
  });
  return match ? entrantOf(match.activity) : "team";
}
