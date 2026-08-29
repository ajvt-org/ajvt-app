import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { nameOf } from "@/lib/person";

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
            user: { select: { phone: true, fullName: true, age: true, photo: true } },
            teamMemberships: {
              where: { team: { activityId: id } },
              select: { team: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { member: { user: { fullName: "asc" } } },
    });

    const roster = registrations.map(({ member }) => ({
      id: member.id,
      fullName: nameOf(member.user),
      phone: member.user.phone ?? null,
      age: member.user.age,
      photo: member.user.photo,
      team: member.teamMemberships[0]?.team || null,
    }));

    return NextResponse.json({ roster });
  },
);
