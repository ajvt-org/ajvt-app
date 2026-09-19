import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { isOwner } from "@/lib/adminRoles";
import { admins as messages } from "@/lib/messages";
import { scopedAdminOrNotFound, setAdminActivities } from "@/lib/adminRoleServer";

export const PUT = withRoute(
  "PUT /api/admin/admins/[id]/activities",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;
    const { activityIds } = await req.json();

    if (!Array.isArray(activityIds) || activityIds.some((value) => typeof value !== "string")) {
      throw new ValidationError();
    }
    if (activityIds.length === 0) throw new ValidationError(messages.pickOneActivity);
    if (id === session.adminId) throw new ValidationError(messages.cannotScopeSelf);

    const admin = await scopedAdminOrNotFound(id);
    if (isOwner(admin.role) && !isOwner(session.role)) {
      throw new ForbiddenError(messages.ownerRoleReserved);
    }

    await setAdminActivities(id, activityIds);

    await logAction(session.username, "UPDATE_ADMIN_ACTIVITIES", admin.username, {
      ...auditContext(session, req),
      targetType: "Admin",
      targetId: id,
      after: { activityIds },
    });

    return NextResponse.json({ ok: true, activityIds });
  },
);
