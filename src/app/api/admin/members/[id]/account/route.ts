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

// Correcting the number an account signs in with. Since the member's own copy
// was dropped, this is the only number the association has for a person, and a
// typo at signup was permanent.
//
// It does not merge anything: a number that already belongs to another account
// is refused, because deciding which of two memberships survives is not a
// button. The session keeps working — the token carries the user id, not the
// number — so the member is not thrown out mid-use.
export const PATCH = withRoute(
  "PATCH /api/admin/members/[id]/account",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { phone } = parse(accountPhoneSchema, await req.json());

    const phoneError = validatePhone(phone);
    if (phoneError) throw new ValidationError(phoneError);
    const next = phone.trim();

    const member = await prisma.member.findUnique({
      where: { id },
      select: { userId: true, user: { select: { id: true, phone: true, fullName: true } } },
    });
    if (!member) throw new NotFoundError(members.notFound);
    if (!member.user?.phone) throw new ConflictError(members.noAccountToCorrect);

    if (member.user.phone === next) return NextResponse.json({ phone: next });

    const taken = await prisma.user.findUnique({
      where: { phone: next },
      select: { id: true },
    });
    if (taken) throw new ConflictError(members.accountPhoneTaken);

    const before = member.user.phone;
    await prisma.user.update({ where: { id: member.user.id }, data: { phone: next } });

    await logAction(session.username, "CHANGE_ACCOUNT_PHONE", `${nameOf(member.user)} — ${next}`, {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: id,
      before: { phone: before },
      after: { phone: next },
    });

    return NextResponse.json({ phone: next });
  },
);
