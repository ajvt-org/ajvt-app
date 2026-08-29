import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { accounts } from "@/lib/messages";

export const POST = withRoute(
  "POST /api/admin/deleted/[id]/restore",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const record = await prisma.deletedRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundError("السجل المحذوف غير موجود");

    const data = record.data as Record<string, unknown>;
    if (record.kind === "Member") {
      const existing = await prisma.member.findUnique({ where: { id: record.recordId } });
      if (existing) throw new ConflictError("العضو موجود بالفعل");
      // Deleting a person archives their account and their payment as two
      // records. The payment hangs off the account, so it cannot come back
      // first: say so rather than letting the foreign key fail as a 500.
      const account = await prisma.user.findUnique({ where: { id: String(data.userId) } });
      if (!account) throw new ConflictError(accounts.restoreAccountFirst);

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
    } else if (record.kind === "User") {
      const taken = await prisma.user.findFirst({
        where: { OR: [{ id: record.recordId }, { phone: String(data.phone) }] },
      });
      if (taken) throw new ConflictError(accounts.phoneTaken);

      await prisma.$transaction([
        prisma.user.create({ data: data as never }),
        prisma.deletedRecord.delete({ where: { id } }),
      ]);

      await logAction(session.username, "RESTORE_USER", record.label, {
        ...auditContext(session, req),
        targetType: "User",
        targetId: record.recordId,
        after: { phone: data.phone ?? null },
      });
    } else {
      throw new ConflictError("لا يمكن استرجاع هذا النوع بعد");
    }

    return NextResponse.json({ ok: true });
  },
);
