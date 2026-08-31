import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { confirmationMatches } from "@/lib/deletedRecords";
import { archive, purgeExpired } from "@/lib/deletedRecordsServer";
import { forgetQuizFootprint } from "@/lib/quizAttemptServer";
import { accounts } from "@/lib/messages";
import type { Prisma } from "@prisma/client";

function identifiers(user: { fullName: string | null; phone: string | null }): string[] {
  return [user.fullName, user.phone].map((v) => v?.trim() ?? "").filter(Boolean);
}

export const DELETE = withRoute(
  "DELETE /api/admin/users/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: accounts.notFound }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const typed = String(body?.confirmName ?? body?.confirmPhone ?? "");
    const expected = identifiers(user);
    if (!expected.length || !expected.some((value) => confirmationMatches(typed, value))) {
      throw new ValidationError(accounts.confirmPerson);
    }

    const membership = await prisma.member.findUnique({ where: { userId: id } });
    const years = await prisma.membership.findMany({ where: { userId: id } });
    const label = user.fullName?.trim() || user.phone || user.id;

    if (membership) {
      await archive(
        "Member",
        id,
        label,
        { ...membership, memberships: years } as unknown as Prisma.InputJsonValue,
        session.username,
      );
    }
    await archive("User", id, label, user as unknown as Prisma.InputJsonValue, session.username);

    const forgotten = await forgetQuizFootprint(id);
    await prisma.$transaction(async (tx) => {
      if (membership) await tx.member.delete({ where: { id: membership.id } });
      await tx.user.delete({ where: { id } });
    });
    await purgeExpired();

    await logAction(session.username, "DELETE_USER", label, {
      ...auditContext(session, req),
      targetType: "User",
      targetId: id,
      before: { fullName: user.fullName, phone: user.phone, memberId: membership?.id ?? null },
      meta: forgotten ?? undefined,
    });

    return NextResponse.json({ ok: true });
  },
);
