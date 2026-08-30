import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { validatePhone } from "@/lib/utils";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { members } from "@/lib/messages";
import { accountPhoneSchema } from "./schema";
import { nameOf } from "@/lib/person";

export const PATCH = withRoute(
  "PATCH /api/admin/members/[id]/account",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { phone } = parse(accountPhoneSchema, await req.json());

    const phoneError = validatePhone(phone);
    if (phoneError) throw new ValidationError(phoneError);
    const next = phone.trim();

    const account = await prisma.user.findUnique({
      where: { id },
      select: { id: true, phone: true, fullName: true },
    });
    if (!account) throw new NotFoundError(members.notFound);
    if (!account.phone) throw new ConflictError(members.noAccountToCorrect);

    if (account.phone === next) return NextResponse.json({ phone: next });

    const taken = await prisma.user.findUnique({
      where: { phone: next },
      select: { id: true },
    });
    if (taken) throw new ConflictError(members.accountPhoneTaken);

    const before = account.phone;
    await prisma.user.update({ where: { id }, data: { phone: next } });

    await logAction(session.username, "CHANGE_ACCOUNT_PHONE", `${nameOf(account)} — ${next}`, {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { phone: before },
      after: { phone: next },
    });

    return NextResponse.json({ phone: next });
  },
);
