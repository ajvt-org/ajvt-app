import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> },
) {
  try {
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
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Team member approve error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> },
) {
  try {
    await requireAdminRole("ACTIVITIES");
    const { teamId, memberId } = await params;

    await prisma.teamMember.deleteMany({ where: { teamId, memberId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Team member remove error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
