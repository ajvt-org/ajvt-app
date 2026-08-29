import { prisma } from "./prisma";
import { nameOf } from "./person";
import { sortAttention, type AttentionRow } from "./activityAttention";

const PERSON = { member: { select: { user: { select: { fullName: true } } } } } as const;
const ACTIVITY = { activity: { select: { id: true, title: true } } } as const;

function only(scoped: string[] | null) {
  return scoped ? { activityId: { in: scoped } } : {};
}

export async function activityAttention(scoped: string[] | null): Promise<AttentionRow[]> {
  const [joins, registrations, suspensions] = await Promise.all([
    prisma.teamMember.findMany({
      where: { status: "PENDING", team: only(scoped) },
      select: {
        id: true,
        createdAt: true,
        ...PERSON,
        team: { select: { name: true, ...ACTIVITY } },
      },
    }),
    prisma.activityRegistration.findMany({
      where: { status: "PENDING", ...only(scoped) },
      select: { id: true, createdAt: true, ...PERSON, ...ACTIVITY },
    }),
    prisma.suspension.findMany({
      where: { status: "PROPOSED", ...only(scoped) },
      select: { id: true, createdAt: true, ...PERSON, ...ACTIVITY },
    }),
  ]);

  const rows: AttentionRow[] = [
    ...joins.map((row) => ({
      id: `join:${row.id}`,
      kind: "join" as const,
      activityId: row.team.activity.id,
      activityTitle: row.team.activity.title,
      who: `${nameOf(row.member.user)} — ${row.team.name}`,
      since: row.createdAt.toISOString(),
    })),
    ...registrations.map((row) => ({
      id: `registration:${row.id}`,
      kind: "registration" as const,
      activityId: row.activity.id,
      activityTitle: row.activity.title,
      who: nameOf(row.member.user),
      since: row.createdAt.toISOString(),
    })),
    ...suspensions.map((row) => ({
      id: `suspension:${row.id}`,
      kind: "suspension" as const,
      activityId: row.activity.id,
      activityTitle: row.activity.title,
      who: nameOf(row.member.user),
      since: row.createdAt.toISOString(),
    })),
  ];

  return sortAttention(rows);
}

export async function activityAttentionCount(scoped: string[] | null): Promise<number> {
  const [joins, registrations, suspensions] = await Promise.all([
    prisma.teamMember.count({ where: { status: "PENDING", team: only(scoped) } }),
    prisma.activityRegistration.count({ where: { status: "PENDING", ...only(scoped) } }),
    prisma.suspension.count({ where: { status: "PROPOSED", ...only(scoped) } }),
  ]);
  return joins + registrations + suspensions;
}
