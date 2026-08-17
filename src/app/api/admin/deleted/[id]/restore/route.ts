import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { NotFoundError, ConflictError } from "@/lib/errors";

export const POST = withRoute(
  "POST /api/admin/deleted/[id]/restore",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const record = await prisma.deletedRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundError("السجل المحذوف غير موجود");
    if (record.kind !== "Member") throw new ConflictError("لا يمكن استرجاع هذا النوع بعد");

    const data = record.data as Record<string, unknown>;
    const existing = await prisma.member.findUnique({ where: { id: record.recordId } });
    if (existing) throw new ConflictError("العضو موجود بالفعل");

    await prisma.$transaction([
      prisma.member.create({ data: data as never }),
      prisma.deletedRecord.delete({ where: { id } }),
    ]);

    await logAction(session.username, "RESTORE_MEMBER", record.label, {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: record.recordId,
      after: { fullName: record.label },
    });

    return NextResponse.json({ ok: true });
  },
);
