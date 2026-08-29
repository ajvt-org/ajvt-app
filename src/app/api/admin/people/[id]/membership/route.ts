import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { issueMembership } from "@/lib/member";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { parse } from "@/lib/validation";
import { validatePaidAmount } from "@/lib/donations";
import { getAppSettings } from "@/lib/settingsServer";
import { addMembership } from "@/lib/membershipCreate";
import { accounts, members } from "@/lib/messages";
import { nameOf } from "@/lib/person";
import { adminMembershipCreateSchema } from "./schema";

export const POST = withRoute(
  "POST /api/admin/people/[id]/membership",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { paymentMethod, paymentProof, paidAmount, surplusAnonymous, status } = parse(
      adminMembershipCreateSchema,
      await req.json(),
    );

    const person = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, memberNumber: true, members: { select: { id: true } } },
    });
    if (!person) throw new NotFoundError(accounts.notFound);
    if (person.members.length) throw new ConflictError(members.accountAlreadyHasMember);

    const { membershipFee, membershipYear } = await getAppSettings();

    let paidAmountValue: number | null = null;
    if (paidAmount !== undefined && paidAmount !== null && String(paidAmount).trim() !== "") {
      const error = validatePaidAmount(paidAmount, membershipFee);
      if (error) return NextResponse.json({ error }, { status: 400 });
      paidAmountValue = Number(paidAmount);
    }

    const issued =
      status === "ACTIVE" && !person.memberNumber ? await issueMembership() : undefined;

    const member = await prisma.$transaction((tx) =>
      addMembership(tx, {
        userId: person.id,
        paymentMethod: paymentMethod.trim(),
        paymentProof: paymentProof || null,
        paidAmount: paidAmountValue,
        surplusAnonymous: surplusAnonymous ?? false,
        status,
        membershipYear,
        fee: membershipFee,
        recordedBy: session.username,
        issued,
      }),
    );

    await logAction(session.username, "ADD_MEMBERSHIP", nameOf(person), {
      ...auditContext(session, req),
      targetType: "Member",
      targetId: member.id,
      after: { paymentMethod, paidAmount: paidAmountValue, status, year: membershipYear },
    });

    return NextResponse.json({ member }, { status: 201 });
  },
);
