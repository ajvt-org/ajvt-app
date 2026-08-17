import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { SCOPED_ROLE } from "@/lib/activityAccess";

export const PUT = withRoute(
  "PUT /api/admin/admins/[id]/activities",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;
    const { activityIds } = await req.json();

    if (!Array.isArray(activityIds) || activityIds.some((v) => typeof v !== "string")) {
      throw new ValidationError();
    }

    const admin = await prisma.admin.findUnique({ where: { id }, select: { username: true } });
    if (!admin) throw new NotFoundError("المشرف غير موجود");

    const found = await prisma.activity.findMany({
      where: { id: { in: activityIds } },
      select: { id: true },
    });
    if (found.length !== activityIds.length) throw new ValidationError("نشاط غير موجود");

    await prisma.$transaction([
      prisma.adminActivity.deleteMany({ where: { adminId: id } }),
      prisma.adminActivity.createMany({
        data: activityIds.map((activityId: string) => ({ adminId: id, activityId })),
      }),
      prisma.admin.update({
        where: { id },
        data: { role: SCOPED_ROLE, tokenVersion: { increment: 1 } },
      }),
    ]);

    await logAction(session.username, "UPDATE_ADMIN_ACTIVITIES", admin.username, {
      ...auditContext(session, req),
      targetType: "Admin",
      targetId: id,
      after: { activityIds },
    });

    return NextResponse.json({ ok: true, activityIds });
  },
);
