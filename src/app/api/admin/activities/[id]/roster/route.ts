import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/roster",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    const registrations = await prisma.activityRegistration.findMany({
      where: { activityId: id, status: "ACTIVE", member: { status: { not: "REJECTED" } } },
      select: {
        member: {
          select: {
            id: true,
            fullName: true,
            user: { select: { phone: true } },
            age: true,
            photo: true,
            teamMemberships: {
              where: { team: { activityId: id } },
              select: { team: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { member: { fullName: "asc" } },
    });

    const roster = registrations.map(({ member }) => ({
      id: member.id,
      fullName: member.fullName,
      phone: member.user?.phone ?? null,
      age: member.age,
      photo: member.photo,
      team: member.teamMemberships[0]?.team || null,
    }));

    return NextResponse.json({ roster });
  },
);
