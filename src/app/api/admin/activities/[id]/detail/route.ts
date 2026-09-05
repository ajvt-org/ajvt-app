import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { activities as messages } from "@/lib/messages";
import { nameOf } from "@/lib/person";
import { PLAYED_MATCH } from "@/lib/activityMatches";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/detail",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    const [activity, rosters, playedMatches] = await Promise.all([
      prisma.activity.findUnique({
        where: { id },
        include: {
          registrations: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              userId: true,
              status: true,
              createdAt: true,
              paymentProof: true,
              rejectionReason: true,
              source: true,
              recordedBy: true,
              user: {
                select: {
                  phone: true,
                  fullName: true,
                  age: true,
                  photo: true,
                },
              },
            },
          },
          teams: {
            orderBy: { name: "asc" },
            select: { id: true, name: true, _count: { select: { members: true } } },
          },
          _count: { select: { matches: true, groups: true } },
        },
      }),
      prisma.teamMember.findMany({
        where: { status: "ACTIVE", team: { activityId: id } },
        select: { userId: true, team: { select: { id: true, name: true } } },
      }),
      prisma.match.count({ where: { activityId: id, ...PLAYED_MATCH } }),
    ]);

    if (!activity) return NextResponse.json({ error: messages.notFound }, { status: 404 });

    const history = await prisma.auditLog.findMany({
      where: { targetType: "Activity", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, adminUsername: true, createdAt: true },
    });

    const teamOf = new Map(rosters.map((m) => [m.userId, m.team]));

    return NextResponse.json({
      activity: {
        ...activity,
        _count: { ...activity._count, playedMatches },
        registrations: activity.registrations.map(({ user, ...r }) => ({
          ...r,
          team: teamOf.get(r.userId) ?? null,
          member: {
            id: r.userId,
            fullName: nameOf(user),
            age: user.age,
            photo: user.photo,
            phone: user.phone ?? null,
          },
        })),
      },
      history,
    });
  },
);
