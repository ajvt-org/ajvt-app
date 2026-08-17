import { prisma } from "./client";
import { placeholder } from "./images";
import { daysAgo, next, pick } from "./random";
import type { SeededActivity } from "./activities";
import type { SeededMember, SeededUser } from "./members";

const TEAM_NAMES = [
  "فريق النجم",
  "فريق الوحدة",
  "فريق الشباب",
  "فريق الأمل",
  "فريق النصر",
  "فريق الفتح",
  "فريق التقدم",
  "فريق الوفاق",
];

const PAIRS: [number, number][] = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [4, 5],
  [6, 7],
  [4, 6],
  [5, 7],
];

export async function seedLeague(
  activity: SeededActivity,
  active: SeededMember[],
  users: SeededUser[],
) {
  const groups = [];
  for (const name of ["المجموعة الأولى", "المجموعة الثانية"]) {
    groups.push(
      await prisma.group.create({ data: { activityId: activity.id, name, capacity: 4 } }),
    );
  }

  const teams = [];
  for (let i = 0; i < TEAM_NAMES.length; i++) {
    teams.push(
      await prisma.team.create({
        data: {
          activityId: activity.id,
          groupId: groups[i < 4 ? 0 : 1].id,
          name: TEAM_NAMES[i],
          logo: i % 2 === 0 ? placeholder(`seed-logo-${next()}.webp`) : null,
        },
      }),
    );
  }

  const roster: Record<string, string[]> = {};
  for (let i = 0; i < active.length; i++) {
    const team = teams[i % teams.length];
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        memberId: active[i].id,
        status: i % 11 === 10 ? "PENDING" : "ACTIVE",
      },
    });
    roster[team.id] = roster[team.id] || [];
    roster[team.id].push(active[i].id);
  }

  for (let i = 0; i < users.length; i++) {
    await prisma.teamFollow.create({
      data: { userId: users[i].id, teamId: teams[i % teams.length].id },
    });
  }

  await seedMatches(activity, teams, roster, users);

  return { groups, teams, roster, matchCount: PAIRS.length };
}

async function seedMatches(
  activity: SeededActivity,
  teams: { id: string }[],
  roster: Record<string, string[]>,
  users: SeededUser[],
) {
  for (let i = 0; i < PAIRS.length; i++) {
    const [h, a] = PAIRS[i];
    const played = i < 6;
    const homeScore = played ? (i * 3) % 4 : null;
    const awayScore = played ? (i * 5) % 3 : null;

    const match = await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: teams[h].id,
        awayTeamId: teams[a].id,
        matchDate: played ? daysAgo(20 - i * 2) : daysAgo(-3 - i),
        round: "دور المجموعات",
        venue: "ملعب القرية",
        order: i,
        homeScore,
        awayScore,
        status: played ? "PLAYED" : "SCHEDULED",
        manOfTheMatchId: played ? (roster[teams[h].id]?.[0] ?? null) : null,
      },
    });

    if (!played) continue;

    for (let g = 0; g < (homeScore ?? 0); g++) {
      const scorers = roster[teams[h].id];
      if (!scorers?.length) break;
      await prisma.matchGoal.create({
        data: {
          matchId: match.id,
          memberId: pick(scorers, g),
          teamId: teams[h].id,
          minute: 10 + g * 17,
        },
      });
    }

    const bookable = roster[teams[a].id];
    if (i % 2 === 0 && bookable?.length) {
      await prisma.matchBooking.create({
        data: {
          matchId: match.id,
          memberId: bookable[0],
          teamId: teams[a].id,
          cardType: i % 4 === 0 ? "YELLOW" : "RED",
          minute: 55 + i,
        },
      });
    }

    if (i === 0) await seedMvp(match.id, roster[teams[h].id] ?? [], users);
  }
}

async function seedMvp(matchId: string, memberIds: string[], users: SeededUser[]) {
  const vote = await prisma.matchMvpVote.create({ data: { matchId, status: "OPEN" } });

  const candidates = [];
  for (const memberId of memberIds.slice(0, 3)) {
    candidates.push(await prisma.mvpCandidate.create({ data: { voteId: vote.id, memberId } }));
  }
  if (!candidates.length) return;

  for (let v = 0; v < Math.min(users.length, 6); v++) {
    await prisma.mvpVote.create({
      data: { voteId: vote.id, candidateId: pick(candidates, v).id, userId: users[v].id },
    });
  }
}

export async function seedDoubles(activity: SeededActivity, active: SeededMember[]) {
  const pairs = [
    ["أحمد ومحمد", 2],
    ["علي ويحيى", 2],
    ["سالم وإبراهيم", 2],
    ["عمر وخالد", 1],
  ] as const;

  let cursor = 0;
  const teams = [];

  for (let i = 0; i < pairs.length; i++) {
    const [, size] = pairs[i];
    const team = await prisma.team.create({
      data: { activityId: activity.id, name: `فريق ${i + 1}`, autoNamed: true },
    });
    for (let m = 0; m < size && cursor < active.length; m++, cursor++) {
      await prisma.teamMember.create({
        data: { teamId: team.id, memberId: active[cursor].id, status: "ACTIVE" },
      });
    }
    teams.push(team);
  }

  return teams;
}
