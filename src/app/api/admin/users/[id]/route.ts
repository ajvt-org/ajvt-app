import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError, ConflictError } from "@/lib/errors";
import { confirmationMatches } from "@/lib/deletedRecords";
import { archive, purgeExpired } from "@/lib/deletedRecordsServer";
import { accounts } from "@/lib/messages";
import type { Prisma } from "@prisma/client";

export const DELETE = withRoute(
  "DELETE /api/admin/users/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: accounts.notFound }, { status: 404 });
    }
    if (await prisma.member.count({ where: { userId: id } })) {
      throw new ConflictError(accounts.hasMember);
    }

    const { confirmPhone } = await req.json().catch(() => ({ confirmPhone: undefined }));
    if (!confirmationMatches(String(confirmPhone ?? ""), user.phone)) {
      throw new ValidationError(accounts.confirmPhone);
    }

    await archive(
      "User",
      id,
      user.phone,
      user as unknown as Prisma.InputJsonValue,
      session.username,
    );
    await prisma.user.delete({ where: { id } });
    await purgeExpired();
    await logAction(session.username, "DELETE_USER", user.phone, {
      ...auditContext(session, req),
      targetType: "User",
      targetId: id,
      before: { phone: user.phone },
    });

    return NextResponse.json({ ok: true });
  },
);
