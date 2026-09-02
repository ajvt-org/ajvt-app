import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { isOwner } from "@/lib/adminRoles";
import { ForbiddenError } from "@/lib/errors";
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
