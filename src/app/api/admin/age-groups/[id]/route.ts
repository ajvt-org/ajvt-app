import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { renameMemberAge } from "@/lib/ageGroups";
import { ageGroups } from "@/lib/messages";

export const PATCH = withRoute(
  "PATCH /api/admin/age-groups/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const body = await req.json();
    const { name, approved } = body;

    if (approved === true && name === undefined) {
      const group = await prisma.ageGroup.findUnique({ where: { id } });
      if (!group) {
        return NextResponse.json({ error: "العصر غير موجود" }, { status: 404 });
      }
      const ageGroup = await prisma.ageGroup.update({ where: { id }, data: { approved: true } });
      await logAction(session.username, "APPROVE_AGE_GROUP", ageGroup.name, {
        ...auditContext(session, req),
        targetType: "AgeGroup",
        targetId: ageGroup.id,
        before: { approved: false },
        after: { approved: true },
      });
      return NextResponse.json({ ageGroup });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: ageGroups.nameRequired }, { status: 400 });
    }
    if (name.trim().length > 30) {
      return NextResponse.json({ error: ageGroups.nameTooLong }, { status: 400 });
    }

    const existing = await prisma.ageGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "العصر غير موجود" }, { status: 404 });
    }
    const clash = await prisma.ageGroup.findUnique({ where: { name: name.trim() } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: ageGroups.alreadyExists }, { status: 409 });
    }

    const [ageGroup, moved] = await prisma.$transaction([
      prisma.ageGroup.update({ where: { id }, data: { name: name.trim() } }),
      renameMemberAge(existing.name, name.trim()),
    ]);
    await logAction(session.username, "UPDATE_AGE_GROUP", `${existing.name} → ${ageGroup.name}`, {
      ...auditContext(session, req),
      targetType: "AgeGroup",
      targetId: ageGroup.id,
      before: { name: existing.name },
      after: { name: ageGroup.name },
      meta: { membersRenamed: moved },
    });

    return NextResponse.json({ ageGroup });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/age-groups/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const existing = await prisma.ageGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "العصر غير موجود" }, { status: 404 });
    }

    await prisma.ageGroup.delete({ where: { id } });
    await logAction(session.username, "DELETE_AGE_GROUP", existing.name);

    return NextResponse.json({ ok: true });
  },
);
