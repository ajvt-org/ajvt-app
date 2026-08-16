import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/roster",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("ACTIVITIES");
    const { id } = await params;

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
