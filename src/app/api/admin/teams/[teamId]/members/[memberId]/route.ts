import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";

export const PATCH = withRoute(
  "PATCH /api/admin/teams/[teamId]/members/[memberId]",
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ teamId: string; memberId: string }> },
  ) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { teamId, memberId } = await params;

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_memberId: { teamId, memberId } },
      select: {
        id: true,
        team: { select: { name: true } },
        member: { select: { fullName: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const teamMember = await prisma.teamMember.update({
      where: { id: existing.id },
      data: { status: "ACTIVE" },
    });
    await logAction(
      session.username,
      "APPROVE_TEAM_JOIN",
      `${existing.member.fullName} — ${existing.team.name}`,
    );

    return NextResponse.json({ teamMember });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/teams/[teamId]/members/[memberId]",
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ teamId: string; memberId: string }> },
  ) => {
    await requireAdminRole("ACTIVITIES");
    const { teamId, memberId } = await params;

    await prisma.teamMember.deleteMany({ where: { teamId, memberId } });

    return NextResponse.json({ ok: true });
  },
);
