import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { OWNER_ROLE, isAdminRole, isOwner } from "@/lib/adminRoles";
import { isScopedRole } from "@/lib/activityAccess";
import { leavesScope, strandsOwnerRole, touchesOwnerRole } from "@/lib/adminRoleChange";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { admins as messages } from "@/lib/messages";

export const DELETE = withRoute(
  "DELETE /api/admin/admins/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;

    if (id === session.adminId) {
      return NextResponse.json({ error: messages.cannotDeleteSelf }, { status: 400 });
    }

    const count = await prisma.admin.count();
    if (count <= 1) {
      return NextResponse.json({ error: messages.cannotDeleteLast }, { status: 400 });
    }

    const target = await prisma.admin.findUnique({
      where: { id },
      select: { username: true, role: true, lastLoginAt: true, createdAt: true },
    });
    if (!target) {
      return NextResponse.json({ error: messages.notFound }, { status: 404 });
    }
    if (isOwner(target.role) && !isOwner(session.role)) {
      throw new ForbiddenError(messages.ownerRoleReserved);
    }

    await prisma.admin.delete({ where: { id } });
    await logAction(session.username, "DELETE_ADMIN", target.username, {
      ...auditContext(session, req),
      targetType: "Admin",
      targetId: id,
      before: target,
    });

    return NextResponse.json({ ok: true });
  },
);

export const PATCH = withRoute(
  "PATCH /api/admin/admins/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;
    const { role } = await req.json();

    if (!isAdminRole(role)) throw new ValidationError(messages.unknownRole);
    if (isScopedRole(role)) throw new ValidationError(messages.scopedRoleSetByActivities);

    const target = await prisma.admin.findUnique({
      where: { id },
      select: { username: true, role: true, activities: { select: { activityId: true } } },
    });
    if (!target) throw new NotFoundError(messages.notFound);

    if (touchesOwnerRole(target.role, role) && !isOwner(session.role)) {
      throw new ForbiddenError(messages.ownerRoleReserved);
    }

    const owners = await prisma.admin.count({ where: { role: OWNER_ROLE } });
    if (strandsOwnerRole(target.role, role, owners)) {
      throw new ValidationError(messages.cannotDemoteLastOwner);
    }
    if (id === session.adminId) throw new ValidationError(messages.cannotChangeOwnRole);

    const clearing = leavesScope(target.role, role);
    const held = target.activities.map((link) => link.activityId);

    await prisma.$transaction([
      ...(clearing ? [prisma.adminActivity.deleteMany({ where: { adminId: id } })] : []),
      prisma.admin.update({ where: { id }, data: { role } }),
    ]);

    await logAction(session.username, "UPDATE_ADMIN_ROLE", target.username, {
      ...auditContext(session, req),
      targetType: "Admin",
      targetId: id,
      before: { role: target.role, activityIds: held },
      after: { role, activityIds: clearing ? [] : held },
    });

    return NextResponse.json({ ok: true, role });
  },
);
