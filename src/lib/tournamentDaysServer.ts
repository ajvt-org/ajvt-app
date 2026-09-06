import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { isUniqueViolation } from "./prismaError";
import { logger } from "./logger";
import { tournament as messages } from "./messages";
import { DAY_MS, atTime, dayDate, derivePlan, endsAtFor } from "./tournamentDays";
import { matchSideTeams, type SideTeams } from "./matchSides";

type Tx = Prisma.TransactionClient;

type DaySide = { id: string; name: string } | null;
type LoadedDayMatch = SideTeams<DaySide>;

const DAY_SIDE = { select: { id: true, name: true } } as const;

const MAX_DAYS = 60;

async function syncBounds(tx: Tx, activityId: string) {
  const activity = await tx.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: { startsAt: true },
  });
  if (!activity.startsAt) return;
  const count = await tx.tournamentDay.count({ where: { activityId } });
  await tx.activity.update({
    where: { id: activityId },
    data: { endsAt: endsAtFor(activity.startsAt, count) },
  });
}

async function shiftFrom(tx: Tx, activityId: string, position: number, by: 1 | -1) {
  const moved = await tx.tournamentDay.findMany({
    where: { activityId, position: { gte: position } },
    select: { id: true, position: true },
  });
  if (moved.length === 0) return 0;
  await tx.tournamentDay.updateMany({
    where: { activityId, position: { gte: position } },
    data: { position: { multiply: -1 } },
  });
  for (const day of moved) {
    await tx.tournamentDay.update({
      where: { id: day.id },
      data: { position: day.position + by },
    });
  }
  return tx.$executeRaw`
    UPDATE "Match" SET "matchDate" = "matchDate" + ${by} * interval '1 day'
    WHERE "dayId" = ANY(${moved.map((d) => d.id)}) AND "matchDate" IS NOT NULL`;
}

export async function ensureDays(activityId: string) {
  const existing = await prisma.tournamentDay.count({ where: { activityId } });
  if (existing > 0) return;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      startsAt: true,
      endsAt: true,
      isTournament: true,
      matches: { select: { id: true, matchDate: true } },
    },
  });
  if (!activity?.isTournament) return;

  const dated = activity.matches.filter((m) => m.matchDate !== null);
  const plan = derivePlan(
    activity.startsAt,
    dated.map((m) => m.matchDate as Date),
  );

  if (!plan) {
    if (!activity.startsAt || !activity.endsAt) return;
    const span = Math.round((activity.endsAt.getTime() - activity.startsAt.getTime()) / DAY_MS) + 1;
    if (span < 1) return;
    const count = capped(activityId, span);
    await prisma.tournamentDay.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        activityId,
        position: i + 1,
        isRest: false,
      })),
      skipDuplicates: true,
    });
    return;
  }

  const days = plan.days.slice(0, capped(activityId, plan.days.length));

  try {
    await prisma.$transaction(async (tx) => {
      const byPosition = new Map<number, string>();
      for (const day of days) {
        const row = await tx.tournamentDay.create({
          data: { activityId, position: day.position, isRest: day.isRest },
        });
        byPosition.set(day.position, row.id);
      }
      for (let i = 0; i < dated.length; i++) {
        await tx.match.update({
          where: { id: dated[i].id },
          data: { dayId: byPosition.get(plan.positionByMatch[i]) ?? null },
        });
      }
      await tx.activity.update({
        where: { id: activityId },
        data: { startsAt: plan.startsAt, endsAt: endsAtFor(plan.startsAt, days.length) },
      });
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }
}

function capped(activityId: string, wanted: number): number {
  if (wanted <= MAX_DAYS) return wanted;
  logger.warn("tournament.days.capped", { activityId, wanted, kept: MAX_DAYS });
  return MAX_DAYS;
}

export async function listDays(activityId: string) {
  await ensureDays(activityId);
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: {
      startsAt: true,
      endsAt: true,
      matchShape: true,
      days: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          isRest: true,
          matches: {
            orderBy: { matchDate: "asc" },
            select: {
              id: true,
              matchDate: true,
              round: true,
              venue: true,
              status: true,
              homeScore: true,
              awayScore: true,
              homePenalties: true,
              awayPenalties: true,
              forfeitWinnerTeamId: true,
              homeTeam: DAY_SIDE,
              awayTeam: DAY_SIDE,
              sideATeam: DAY_SIDE,
              sideBTeam: DAY_SIDE,
            },
          },
        },
      },
      matches: {
        where: { dayId: null },
        orderBy: { order: "asc" },
        select: {
          id: true,
          matchDate: true,
          round: true,
          venue: true,
          status: true,
          homeScore: true,
          awayScore: true,
          homePenalties: true,
          awayPenalties: true,
          forfeitWinnerTeamId: true,
          homeTeam: DAY_SIDE,
          awayTeam: DAY_SIDE,
          sideATeam: DAY_SIDE,
          sideBTeam: DAY_SIDE,
        },
      },
    },
  });

  const named = <T extends LoadedDayMatch>(match: T) => {
    const sides = matchSideTeams(match, activity.matchShape);
    return { ...match, firstTeam: sides.first, secondTeam: sides.second };
  };

  return {
    startsAt: activity.startsAt,
    endsAt: activity.endsAt,
    days: activity.days.map((day) => ({
      ...day,
      matches: day.matches.map(named),
      date: activity.startsAt ? dayDate(activity.startsAt, day.position) : null,
    })),
    unscheduled: activity.matches.map(named),
  };
}

export async function insertDay(activityId: string, position: number | null, isRest: boolean) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.tournamentDay.count({ where: { activityId } });
    const at = position === null ? count + 1 : position;
    if (at < 1 || at > count + 1) throw new ValidationError(messages.dayPositionInvalid);
    const shifted = await shiftFrom(tx, activityId, at, 1);
    const day = await tx.tournamentDay.create({
      data: { activityId, position: at, isRest },
    });
    await syncBounds(tx, activityId);
    return { day, shifted };
  });
}

export async function removeDay(activityId: string, dayId: string) {
  return prisma.$transaction(async (tx) => {
    const day = await tx.tournamentDay.findUnique({
      where: { id: dayId },
      select: { position: true, activityId: true, _count: { select: { matches: true } } },
    });
    if (!day || day.activityId !== activityId) throw new NotFoundError(messages.dayNotFound);
    if (day._count.matches > 0) throw new ConflictError(messages.dayHasMatches);
    await tx.tournamentDay.delete({ where: { id: dayId } });
    const shifted = await shiftFrom(tx, activityId, day.position + 1, -1);
    await syncBounds(tx, activityId);
    return { shifted };
  });
}

export async function setDayRest(activityId: string, dayId: string, isRest: boolean) {
  const day = await prisma.tournamentDay.findUnique({
    where: { id: dayId },
    select: { activityId: true, _count: { select: { matches: true } } },
  });
  if (!day || day.activityId !== activityId) throw new NotFoundError(messages.dayNotFound);
  if (isRest && day._count.matches > 0) throw new ConflictError(messages.dayHasMatches);
  return prisma.tournamentDay.update({ where: { id: dayId }, data: { isRest } });
}

export async function assignMatch(
  activityId: string,
  matchId: string,
  dayId: string | null,
  time: string,
) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { activityId: true },
  });
  if (!match || match.activityId !== activityId) throw new NotFoundError(messages.matchNotFound);

  if (dayId === null) {
    return prisma.match.update({ where: { id: matchId }, data: { dayId: null } });
  }

  const day = await prisma.tournamentDay.findUnique({
    where: { id: dayId },
    select: { activityId: true, position: true, isRest: true },
  });
  if (!day || day.activityId !== activityId) throw new NotFoundError(messages.dayNotFound);
  if (day.isRest) throw new ConflictError(messages.dayIsRest);

  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: { startsAt: true },
  });
  if (!activity.startsAt) throw new ConflictError(messages.startDateMissing);

  return prisma.match.update({
    where: { id: matchId },
    data: { dayId, matchDate: atTime(dayDate(activity.startsAt, day.position), time) },
  });
}
