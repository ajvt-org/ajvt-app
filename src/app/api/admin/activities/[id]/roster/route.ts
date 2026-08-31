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
      where: {
        activityId: id,
        status: "ACTIVE",
        user: { memberships: { some: { status: { not: "REJECTED" } } } },
      },
      select: {
        user: {
          select: {
            id: true,
            phone: true,
            fullName: true,
            age: true,
            photo: true,
            teamMemberships: {
              where: { team: { activityId: id } },
              select: { team: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { user: { fullName: "asc" } },
    });

    const roster = registrations
      .map(({ user }) => ({
        id: user.id,
        fullName: nameOf(user),
        phone: user.phone ?? null,
        age: user.age,
        photo: user.photo,
        team: user.teamMemberships[0]?.team || null,
      }))
      .filter((entry): entry is typeof entry & { id: string } => entry.id !== null);

    return NextResponse.json({ roster });
  },
);
