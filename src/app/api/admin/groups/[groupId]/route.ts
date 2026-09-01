import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGroupAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ConflictError } from "@/lib/errors";
import { tournament } from "@/lib/messages";

export const PATCH = withRoute(
  "PATCH /api/admin/groups/[groupId]",
  async (req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) => {
    const { groupId } = await params;
    const session = await requireGroupAccess(groupId);
    const { name, capacity } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: tournament.groupNameRequired }, { status: 400 });
    }
    if (name.trim().length > 40) {
      return NextResponse.json({ error: tournament.groupNameTooLong }, { status: 400 });
    }
    const data: { name: string; capacity?: number | null } = { name: name.trim() };
    if (capacity !== undefined) {
      if (capacity === null || capacity === "") {
        data.capacity = null;
      } else {
        const capacityValue = Number(capacity);
        if (!Number.isInteger(capacityValue) || capacityValue < 2 || capacityValue > 64) {
          return NextResponse.json({ error: tournament.targetTeamsRange }, { status: 400 });
        }
        data.capacity = capacityValue;
      }
    }

    const existing = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true, capacity: true },
    });
    const group = await prisma.group.update({ where: { id: groupId }, data });
    await logAction(session.username, "UPDATE_GROUP", group.name, {
      ...auditContext(session, req),
      targetType: "Group",
      targetId: group.id,
      before: existing,
      after: { name: group.name, capacity: group.capacity },
    });

    return NextResponse.json({ group });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/groups/[groupId]",
  async (_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) => {
    const { groupId } = await params;
    const session = await requireGroupAccess(groupId);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true, activityId: true },
    });
    if (!group) {
      return NextResponse.json({ error: tournament.groupNotFound }, { status: 404 });
    }

    const fixtures = await prisma.match.count({ where: { activityId: group.activityId } });
    if (fixtures > 0) throw new ConflictError(tournament.groupHasMatches);

    await prisma.group.delete({ where: { id: groupId } });
    await logAction(session.username, "DELETE_GROUP", group.name);

    return NextResponse.json({ ok: true });
  },
);
