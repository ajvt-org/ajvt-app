import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { villages } from "@/lib/messages";
import { VILLAGE_NAME_MAX, isReservedVillageName } from "@/lib/villages";
import { renameMemberVillage } from "@/lib/villagesServer";

export const PATCH = withRoute(
  "PATCH /api/admin/villages/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { name } = await req.json();
    const trimmed = String(name ?? "").trim();

    if (!trimmed) {
      return NextResponse.json({ error: villages.nameRequired }, { status: 400 });
    }
    if (trimmed.length > VILLAGE_NAME_MAX) {
      return NextResponse.json({ error: villages.nameTooLong }, { status: 400 });
    }
    if (isReservedVillageName(trimmed)) {
      return NextResponse.json({ error: villages.reservedName }, { status: 400 });
    }

    const existing = await prisma.village.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: villages.notFound }, { status: 404 });
    }
    const clash = await prisma.village.findUnique({ where: { name: trimmed } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: villages.alreadyExists }, { status: 409 });
    }

    const [village, moved] = await prisma.$transaction([
      prisma.village.update({ where: { id }, data: { name: trimmed } }),
      renameMemberVillage(existing.name, trimmed),
    ]);
    await logAction(session.username, "UPDATE_VILLAGE", `${existing.name} → ${village.name}`, {
      ...auditContext(session, req),
      targetType: "Village",
      targetId: village.id,
      before: { name: existing.name },
      after: { name: village.name },
      meta: { membersRenamed: moved },
    });

    return NextResponse.json({ village });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/villages/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const existing = await prisma.village.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: villages.notFound }, { status: 404 });
    }

    await prisma.village.delete({ where: { id } });
    await logAction(session.username, "DELETE_VILLAGE", existing.name);

    return NextResponse.json({ ok: true });
  },
);
