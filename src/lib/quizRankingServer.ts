import { prisma } from "./prisma";
import { getCompetition } from "./competitionServer";
import { competitionDay, weekOf } from "./quizDay";
import {
  dailyRanking,
  weeklyRanking,
  finalRanking,
  standingOf,
  type DayScore,
  type Ranked,
} from "./quizRanking";

export interface Board {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  total: number;
}

async function dayScores(competitionId: string): Promise<DayScore[]> {
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizDay: { competitionId } },
    select: { userId: true, score: true, finishedAt: true, quizDay: { select: { day: true } } },
  });
  return attempts.map((a) => ({
    userId: a.userId,
    day: a.quizDay.day,
    score: a.score,
    finishedAt: a.finishedAt,
  }));
}

async function named(rows: Ranked[], limit?: number): Promise<Board[]> {
  const wanted = typeof limit === "number" ? rows.slice(0, limit) : rows;
  const users = await prisma.user.findMany({
    where: { id: { in: wanted.map((r) => r.userId) } },
    select: {
      id: true,
      members: { select: { fullName: true, photo: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  const byId = new Map(users.map((u) => [u.id, u.members[0]]));

  return wanted.map((r) => {
    const member = byId.get(r.userId);
    return {
      rank: r.rank,
      userId: r.userId,
      name: member?.fullName ?? "مشارك",
      photoUrl: member?.photo ? `/api/files/member/${member.photo}` : null,
      total: r.total,
    };
  });
}

export interface Standings {
  running: boolean;
  day: string | null;
  week: number | null;
  today: Board[];
  thisWeek: Board[];
  overall: Board[];
  mine: { today: Ranked | null; thisWeek: Ranked | null; overall: Ranked | null } | null;
}

export async function getStandings(
  userId?: string,
  limit = 10,
  now = new Date(),
): Promise<Standings> {
  const competition = await getCompetition();
  const empty: Standings = {
    running: false,
    day: null,
    week: null,
    today: [],
    thisWeek: [],
    overall: [],
    mine: null,
  };
  if (!competition?.startedAt) return empty;

  const scores = await dayScores(competition.id);
  const today = competitionDay(competition.startsOn, competition.days, now);
  const week = today ? weekOf(competition.startsOn, today.day) : null;

  const dayRows = today ? dailyRanking(scores, today.day) : [];
  const weekRows =
    week !== null
      ? weeklyRanking(scores, competition.startsOn, competition.weeklyCountingDays, week)
      : [];
  const allRows = finalRanking(scores, competition.startsOn, competition.weeklyCountingDays);

  return {
    running: true,
    day: today?.day ?? null,
    week,
    today: await named(dayRows, limit),
    thisWeek: await named(weekRows, limit),
    overall: await named(allRows, limit),
    mine: userId
      ? {
          today: standingOf(dayRows, userId),
          thisWeek: standingOf(weekRows, userId),
          overall: standingOf(allRows, userId),
        }
      : null,
  };
}

export async function getWinners(now = new Date()) {
  const competition = await getCompetition();
  if (!competition?.startedAt) return { days: [], weeks: [], overall: null };

  const scores = await dayScores(competition.id);
  const played = [...new Set(scores.map((s) => s.day))].sort();
  const weeks = [...new Set(played.map((d) => weekOf(competition.startsOn, d)))]
    .filter((w) => w >= 0)
    .sort((a, b) => a - b);

  const finished = competitionDay(competition.startsOn, competition.days, now) === null;

  return {
    days: await Promise.all(
      played.map(async (day) => ({
        day,
        winner: (await named(dailyRanking(scores, day), 1))[0] ?? null,
      })),
    ),
    weeks: await Promise.all(
      weeks.map(async (week) => ({
        week,
        winner:
          (
            await named(
              weeklyRanking(scores, competition.startsOn, competition.weeklyCountingDays, week),
              1,
            )
          )[0] ?? null,
      })),
    ),
    overall: finished
      ? ((
          await named(finalRanking(scores, competition.startsOn, competition.weeklyCountingDays), 1)
        )[0] ?? null)
      : null,
  };
}
