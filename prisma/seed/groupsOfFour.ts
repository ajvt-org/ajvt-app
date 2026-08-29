import { prisma } from "./client";
import { daysAgo } from "./random";
import type { SeededMember } from "./members";

const GROUP_NAMES = ["المجموعة 1", "المجموعة 2", "المجموعة 3", "المجموعة 4"];

const TEAM_NAMES = [
  ["الصقور", "النسور", "البزاة", "الشواهين"],
  ["الأمواج", "الرمال", "الواحة", "النخيل"],
  ["الفجر", "الضحى", "الأصيل", "الغروب"],
  ["الشمال", "الجنوب", "الشرق", "الغرب"],
];

const PAIRS: [number, number][] = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
];

const DEADLOCKED_GROUP = 3;

function scoreFor(groupIndex: number, matchIndex: number): [number, number] {
  if (groupIndex === DEADLOCKED_GROUP) {
    return matchIndex === 0 ? [2, 0] : [0, 0];
  }
  const [home, away] = PAIRS[matchIndex];
  return [Math.max(3 - home, 0) + (matchIndex % 2), Math.max(2 - away, 0)];
}

export async function seedGroupsOfFour(active: SeededMember[]) {
  const activity = await prisma.activity.create({
    data: {
      title: "كأس القرى الكبرى",
      description:
        "ستة عشر فريقاً في أربع مجموعات، انتهى دور المجموعات وينتظر اعتماد جدول ربع النهائي.",
      period: "سبتمبر 2026",
      startsAt: daysAgo(14, 16),
      endsAt: daysAgo(1, 20),
      isTournament: true,
      format: "GROUPS_THEN_KNOCKOUT",
      isOpen: false,
      order: 6,
    },
  });

  const teams: { id: string }[][] = [];
  let player = 0;
  for (let g = 0; g < GROUP_NAMES.length; g++) {
    const group = await prisma.group.create({
      data: { activityId: activity.id, name: GROUP_NAMES[g], capacity: 4 },
    });
    const groupTeams = [];
    for (const name of TEAM_NAMES[g]) {
      const team = await prisma.team.create({
        data: { activityId: activity.id, groupId: group.id, name },
      });
      for (let i = 0; i < 3 && player < active.length; i++, player++) {
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            memberId: active[player].id,
            userId: active[player].userId,
            status: "ACTIVE",
          },
        });
      }
      groupTeams.push(team);
    }
    teams.push(groupTeams);
  }

  let order = 0;
  for (let g = 0; g < teams.length; g++) {
    for (let i = 0; i < PAIRS.length; i++) {
      const [h, a] = PAIRS[i];
      const [homeScore, awayScore] = scoreFor(g, i);
      await prisma.match.create({
        data: {
          activityId: activity.id,
          homeTeamId: teams[g][h].id,
          awayTeamId: teams[g][a].id,
          matchDate: daysAgo(13 - i, 16 + (i % 2)),
          round: `${GROUP_NAMES[g]} — الجولة ${Math.floor(i / 2) + 1}`,
          venue: "ملعب كوتش",
          order: order++,
          homeScore,
          awayScore,
          status: "PLAYED",
        },
      });
    }
  }

  return { activity, groups: GROUP_NAMES.length, teams: teams.flat().length };
}
