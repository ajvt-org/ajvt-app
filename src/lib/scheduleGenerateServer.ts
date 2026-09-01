import { prisma } from "./prisma";
import { generateMatchSchedule } from "./tournament";
import { layoutRounds } from "./scheduleLayout";
import { atTime, dayDate, endsAtFor } from "./tournamentDays";
import { ensureDays } from "./tournamentDaysServer";
import { ValidationError, ConflictError } from "./errors";
import { tournament as messages } from "./messages";
import { logAction } from "./audit";
import { counted } from "./arabicCount";
import { MATCH } from "./messages";

export interface GenerateOptions {
  perTeam: number;
  times: string[];
  venue: string | null;
  username: string;
}

export async function generateGroupSchedule(activityId: string, options: GenerateOptions) {
  const { perTeam, times, venue, username } = options;

  const [teams, existingMatches, maxOrderRow] = await Promise.all([
    prisma.team.findMany({
      where: { activityId },
      select: { id: true, name: true, groupId: true, group: { select: { name: true } } },
    }),
    prisma.match.findMany({
      where: { activityId },
      select: { homeTeamId: true, awayTeamId: true },
    }),
    prisma.match.findFirst({
      where: { activityId },
      orderBy: { order: "desc" },
      select: { order: true },
    }),
  ]);

  if (teams.length < 2) throw new ValidationError(messages.needTwoTeams);

  const existingCounts = new Map<string, number>();
  const existingPairs = new Set<string>();
  for (const m of existingMatches) {
    if (m.homeTeamId === null || m.awayTeamId === null) continue;
    existingCounts.set(m.homeTeamId, (existingCounts.get(m.homeTeamId) || 0) + 1);
    existingCounts.set(m.awayTeamId, (existingCounts.get(m.awayTeamId) || 0) + 1);
    existingPairs.add([m.homeTeamId, m.awayTeamId].sort().join("|"));
  }

  const pools = new Map<string | null, { name: string; teamIds: string[] }>();
  for (const t of teams) {
    const key = t.groupId;
    if (!pools.has(key)) pools.set(key, { name: t.group?.name || "بدون مجموعة", teamIds: [] });
    pools.get(key)!.teamIds.push(t.id);
  }
  const multiplePools = pools.size > 1;

  type Fixture = { round: number; homeTeamId: string; awayTeamId: string; label: string };
  const allFixtures: Fixture[] = [];
  for (const pool of pools.values()) {
    if (pool.teamIds.length < 2) continue;
    const fixtures = generateMatchSchedule(pool.teamIds, perTeam, existingCounts, existingPairs);
    for (const f of fixtures) {
      allFixtures.push({
        ...f,
        label: multiplePools ? `${pool.name} — الجولة ${f.round}` : `الجولة ${f.round}`,
      });
    }
  }

  if (allFixtures.length === 0) throw new ConflictError(messages.nothingToGenerate(perTeam));

  allFixtures.sort((a, b) => a.round - b.round);

  const chunks: { label: string; fixtures: Fixture[] }[] = [];
  for (const f of allFixtures) {
    const last = chunks[chunks.length - 1];
    if (last && last.label === f.label) last.fixtures.push(f);
    else chunks.push({ label: f.label, fixtures: [f] });
  }

  await ensureDays(activityId);
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: {
      startsAt: true,
      days: {
        orderBy: { position: "asc" },
        select: { id: true, position: true, isRest: true, _count: { select: { matches: true } } },
      },
    },
  });

  const startsAt = activity.startsAt;
  const layout = startsAt
    ? layoutRounds(
        chunks.map((c) => c.fixtures.length),
        times,
      )
    : null;

  let created = 0;
  await prisma.$transaction(async (tx) => {
    let nextOrder = (maxOrderRow?.order || 0) + 1;

    const freeDays = activity.days.filter((d) => !d.isRest && d._count.matches === 0);
    let appendAt = activity.days.length;
    const dayFor = async (offset: number) => {
      while (freeDays.length <= offset) {
        appendAt += 1;
        freeDays.push({
          ...(await tx.tournamentDay.create({
            data: { activityId, position: appendAt, isRest: false },
          })),
          _count: { matches: 0 },
        });
      }
      return freeDays[offset];
    };

    for (let c = 0; c < chunks.length; c++) {
      for (let i = 0; i < chunks[c].fixtures.length; i++) {
        const fixture = chunks[c].fixtures[i];
        const placement = layout?.[c][i] ?? null;
        const day = placement && startsAt ? await dayFor(placement.day) : null;
        await tx.match.create({
          data: {
            activityId,
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
            round: fixture.label,
            order: nextOrder++,
            venue: venue || null,
            dayId: day?.id ?? null,
            matchDate:
              day && startsAt && placement
                ? atTime(dayDate(startsAt, day.position), placement.time)
                : null,
          },
        });
        created += 1;
      }
    }

    if (startsAt) {
      const count = await tx.tournamentDay.count({ where: { activityId } });
      await tx.activity.update({
        where: { id: activityId },
        data: { endsAt: endsAtFor(startsAt, count) },
      });
    }
  });

  await logAction(username, "GENERATE_MATCH_SCHEDULE", `${counted(created, MATCH)}`);

  return { created, scheduled: startsAt !== null };
}
