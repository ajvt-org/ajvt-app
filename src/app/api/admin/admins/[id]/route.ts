import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { isAdminRole, isOwner } from "@/lib/adminRoles";
import { isScopedRole } from "@/lib/activityAccess";
import { touchesOwnerRole } from "@/lib/adminRoleChange";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { admins as messages } from "@/lib/messages";
import { adminOrNotFound, refuseLastAdmin, removeAdmin } from "@/lib/adminAccountsServer";
import {
  refuseStrandingTheLastOwner,
  saveAdminRole,
  scopedAdminOrNotFound,
} from "@/lib/adminRoleServer";

export const DELETE = withRoute(
  "DELETE /api/admin/admins/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;

    if (id === session.adminId) throw new ValidationError(messages.cannotDeleteSelf);
    await refuseLastAdmin();

    const target = await adminOrNotFound(id);
    if (isOwner(target.role) && !isOwner(session.role)) {
      throw new ForbiddenError(messages.ownerRoleReserved);
    }

    await removeAdmin(id);

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

    const target = await scopedAdminOrNotFound(id);
    if (touchesOwnerRole(target.role, role) && !isOwner(session.role)) {
      throw new ForbiddenError(messages.ownerRoleReserved);
    }

    await refuseStrandingTheLastOwner(target.role, role);
    if (id === session.adminId) throw new ValidationError(messages.cannotChangeOwnRole);

    const held = target.activities.map((link) => link.activityId);
    const clearing = await saveAdminRole(id, target.role, role);

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
