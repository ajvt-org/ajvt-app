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
  [0, 3],
  [1, 2],
  [4, 5],
  [6, 7],
  [4, 6],
  [5, 7],
  [4, 7],
  [5, 6],
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
  const todayLate = new Date();
  todayLate.setUTCHours(16, 0, 0, 0);

  for (let i = 0; i < PAIRS.length; i++) {
    const [h, a] = PAIRS[i];
    const played = i < PAIRS.length - 1;
    const homeScore = played ? (i * 3) % 4 : null;
    const awayScore = played ? (i * 5) % 3 : null;

    const match = await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: teams[h].id,
        awayTeamId: teams[a].id,
        matchDate: played ? daysAgo(22 - i * 2) : todayLate,
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

    for (const [teamIndex, score] of [
      [h, homeScore ?? 0],
      [a, awayScore ?? 0],
    ] as const) {
      const scorers = roster[teams[teamIndex].id];
      if (!scorers?.length) continue;
      for (let g = 0; g < score; g++) {
        await prisma.matchGoal.create({
          data: {
            matchId: match.id,
            memberId: pick(scorers, g),
            teamId: teams[teamIndex].id,
            minute: 10 + g * 17 + (teamIndex === a ? 5 : 0),
          },
        });
      }
    }

    const awayRoster = roster[teams[a].id];
    if (i % 2 === 0 && awayRoster?.length) {
      await prisma.matchBooking.create({
        data: {
          matchId: match.id,
          memberId: awayRoster[0],
          teamId: teams[a].id,
          cardType: i % 4 === 0 ? "YELLOW" : "RED",
          minute: 55 + i,
        },
      });
    }
    // Odd matches book the home side's second player, so the teams that host
    // twice give one member two yellows across the run — the accumulation case.
    const homeRoster = roster[teams[h].id];
    if (i % 2 === 1 && homeRoster?.length > 1) {
      await prisma.matchBooking.create({
        data: {
          matchId: match.id,
          memberId: homeRoster[1],
          teamId: teams[h].id,
          cardType: "YELLOW",
          minute: 30 + i,
        },
      });
    }

    if (i === 0) await seedMvp(match.id, roster[teams[h].id] ?? [], users, "OPEN");
    if (i === 2) await seedMvp(match.id, roster[teams[h].id] ?? [], users, "CLOSED");
  }
}

async function seedMvp(
  matchId: string,
  memberIds: string[],
  users: SeededUser[],
  status: "OPEN" | "CLOSED",
) {
  const vote = await prisma.matchMvpVote.create({
    data: { matchId, status, closedAt: status === "CLOSED" ? daysAgo(1) : null },
  });

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
  let cursor = 0;
  const teams = [];

  for (let i = 0; i < 4; i++) {
    const team = await prisma.team.create({
      data: { activityId: activity.id, name: `فريق ${i + 1}`, autoNamed: true },
    });
    for (let m = 0; m < 2 && cursor < active.length; m++, cursor++) {
      await prisma.teamMember.create({
        data: { teamId: team.id, memberId: active[cursor].id, status: "ACTIVE" },
      });
    }
    teams.push(team);
  }

  // Two played semi-finals and no final: the bracket tree renders, one semi
  // carries a shootout, and "توليد الدور التالي" has real work to do.
  await prisma.match.create({
    data: {
      activityId: activity.id,
      homeTeamId: teams[0].id,
      awayTeamId: teams[1].id,
      matchDate: daysAgo(3),
      round: "نصف النهائي",
      venue: "قاعة الرابطة",
      order: 0,
      isKnockout: true,
      bracketRound: 1,
      homeScore: 2,
      awayScore: 2,
      homePenalties: 4,
      awayPenalties: 3,
      status: "PLAYED",
    },
  });
  await prisma.match.create({
    data: {
      activityId: activity.id,
      homeTeamId: teams[2].id,
      awayTeamId: teams[3].id,
      matchDate: daysAgo(2),
      round: "نصف النهائي",
      venue: "قاعة الرابطة",
      order: 1,
      isKnockout: true,
      bracketRound: 1,
      homeScore: 1,
      awayScore: 0,
      status: "PLAYED",
    },
  });

  return teams;
}

// A tournament played to the end: two groups of three, crossed semi-finals
// with one shootout, and a final with a champion — every stage in PLAYED
// state with scorers on both sides, cards, men of the match and a closed
// MVP vote, all dated in the past.
export async function seedFinishedCup(
  activity: SeededActivity,
  active: SeededMember[],
  users: SeededUser[],
) {
  const names = ["الصقور", "النسور", "الأسود", "الفهود", "الذئاب", "العقبان"];
  const groups = [];
  for (const name of ["مجموعة الكأس أ", "مجموعة الكأس ب"]) {
    groups.push(
      await prisma.group.create({ data: { activityId: activity.id, name, capacity: 3 } }),
    );
  }

  const teams = [];
  const roster: Record<string, string[]> = {};
  for (let i = 0; i < names.length; i++) {
    const team = await prisma.team.create({
      data: { activityId: activity.id, groupId: groups[i < 3 ? 0 : 1].id, name: names[i] },
    });
    roster[team.id] = [];
    for (let m = 0; m < 5; m++) {
      const member = active[(i * 5 + m + 40) % active.length];
      await prisma.teamMember.create({
        data: { teamId: team.id, memberId: member.id, status: "ACTIVE" },
      });
      roster[team.id].push(member.id);
    }
    teams.push(team);
  }

  type Row = [number, number, number, number, number, string, boolean, number | null];
  // [home, away, homeScore, awayScore, daysAgo, round, isKnockout, bracketRound]
  const rows: Row[] = [
    [0, 1, 2, 1, 40, "مجموعة الكأس أ — الجولة 1", false, null],
    [2, 0, 0, 1, 39, "مجموعة الكأس أ — الجولة 2", false, null],
    [1, 2, 3, 0, 38, "مجموعة الكأس أ — الجولة 3", false, null],
    [3, 4, 1, 1, 37, "مجموعة الكأس ب — الجولة 1", false, null],
    [5, 3, 0, 2, 36, "مجموعة الكأس ب — الجولة 2", false, null],
    [4, 5, 1, 0, 35, "مجموعة الكأس ب — الجولة 3", false, null],
    [0, 4, 2, 0, 33, "نصف النهائي", true, 1],
    [3, 1, 1, 1, 33, "نصف النهائي", true, 1],
    [0, 3, 3, 1, 30, "النهائي", true, 2],
  ];

  for (let i = 0; i < rows.length; i++) {
    const [h, a, hs, as, ago, round, isKnockout, bracketRound] = rows[i];
    const isFinal = bracketRound === 2;
    const shootout = isKnockout && hs === as;
    const match = await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: teams[h].id,
        awayTeamId: teams[a].id,
        matchDate: daysAgo(ago),
        round,
        venue: "ملعب القرية",
        order: i,
        isKnockout,
        bracketRound,
        homeScore: hs,
        awayScore: as,
        homePenalties: shootout ? 4 : null,
        awayPenalties: shootout ? 2 : null,
        status: "PLAYED",
        manOfTheMatchId: roster[teams[h].id][0],
      },
    });

    for (const [teamIndex, score] of [
      [h, hs],
      [a, as],
    ] as const) {
      for (let g = 0; g < score; g++) {
        await prisma.matchGoal.create({
          data: {
            matchId: match.id,
            memberId: pick(roster[teams[teamIndex].id], g),
            teamId: teams[teamIndex].id,
            minute: 12 + g * 21 + (teamIndex === a ? 7 : 0),
          },
        });
      }
    }

    if (i % 3 === 0) {
      await prisma.matchBooking.create({
        data: {
          matchId: match.id,
          memberId: roster[teams[a].id][1],
          teamId: teams[a].id,
          cardType: i === 6 ? "RED" : "YELLOW",
          minute: 40 + i,
        },
      });
    }

    if (isFinal) await seedMvp(match.id, roster[teams[h].id], users, "CLOSED");
  }

  return teams;
}

export async function seedSingles(activity: SeededActivity, active: SeededMember[]) {
  const teams = [];
  for (let i = 0; i < 8; i++) {
    const team = await prisma.team.create({
      data: { activityId: activity.id, name: `لاعب ${i + 1}`, autoNamed: true },
    });
    const member = active[active.length - 1 - i];
    if (member) {
      await prisma.teamMember.create({
        data: { teamId: team.id, memberId: member.id, status: "ACTIVE" },
      });
    }
    teams.push(team);
  }
  return teams;
}
