import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";

export const PATCH = withRoute(
  "PATCH /api/admin/teams/[teamId]",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { teamId } = await params;
    const { name, groupId, logo } = await req.json();

    const existing = await prisma.team.findUnique({
      where: { id: teamId },
      select: { activityId: true, groupId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "الفريق غير موجود" }, { status: 404 });
    }

    const data: { name?: string; groupId?: string | null; logo?: string | null } = {};

    if (name !== undefined) {
      if (!name.trim()) return NextResponse.json({ error: "اسم الفريق مطلوب" }, { status: 400 });
      if (name.trim().length > 40)
        return NextResponse.json(
          { error: "اسم الفريق طويل جداً (40 حرفاً كحد أقصى)" },
          { status: 400 },
        );
      data.name = name.trim();
    }
    if (groupId !== undefined) {
      const newGroupId = groupId || null;
      if (newGroupId) {
        const group = await prisma.group.findFirst({
          where: { id: newGroupId, activityId: existing.activityId },
        });
        if (!group) return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 400 });
      }
      // Moving a team between groups after its schedule was generated would
      // desync existing matches' round labels/standings from the new group —
      // require the schedule to be cleared first (delete the matches, reassign, regenerate).
      if (newGroupId !== existing.groupId) {
        const hasMatches = await prisma.match.findFirst({
          where: {
            activityId: existing.activityId,
            OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
          },
          select: { id: true },
        });
        if (hasMatches) {
          return NextResponse.json(
            {
              error:
                "لا يمكن تغيير مجموعة فريق لديه مباريات مسجَّلة بالفعل — احذف مباريات هذا الفريق أولاً ثم أعد التوليد",
            },
            { status: 409 },
          );
        }
      }
      data.groupId = newGroupId;
    }
    if (logo !== undefined) {
      data.logo = logo || null;
    }

    const team = await prisma.team.update({ where: { id: teamId }, data });
    await logAction(session.username, "UPDATE_TEAM", team.name);

    return NextResponse.json({ team });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/teams/[teamId]",
  async (_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { teamId } = await params;

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
    if (!team) {
      return NextResponse.json({ error: "الفريق غير موجود" }, { status: 404 });
    }

    await prisma.team.delete({ where: { id: teamId } });
    await logAction(session.username, "DELETE_TEAM", team.name);

    return NextResponse.json({ ok: true });
  },
);
