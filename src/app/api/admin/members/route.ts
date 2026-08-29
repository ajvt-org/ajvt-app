import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { issueMembership, generateTempPassword } from "@/lib/member";
import { logAction, auditContext } from "@/lib/audit";
import * as bcrypt from "bcryptjs";
import { sendMatchReminders } from "@/lib/tournamentNotify";
import { validatePaidAmount } from "@/lib/donations";
import { getAppSettings } from "@/lib/settingsServer";
import { recordMembershipYear } from "@/lib/membershipRecord";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { parse } from "@/lib/validation";
import { ConflictError } from "@/lib/errors";
import { members, villages as villageMessages } from "@/lib/messages";
import { ageForVillage, isKnownVillage } from "@/lib/villages";
import { villageNames } from "@/lib/villagesServer";
import { adminMemberCreateSchema } from "./schema";
import { paidForYear } from "@/lib/paidBreakdown";
import { PERSON_WITH_PHONE_SELECT, nameOf, withPerson } from "@/lib/person";

export const GET = withRoute("GET /api/admin/members", async () => {
  await requireAdminRole("MEMBERS");
  sendMatchReminders().catch((err) => logger.error("match.reminders.error", err));
  const members = await prisma.member.findMany({
    include: {
      user: { select: PERSON_WITH_PHONE_SELECT },
      registrations: {
        select: { activityId: true, activity: { select: { id: true, title: true } } },
      },
      payments: {
        where: { purpose: "MEMBERSHIP" },
        select: { amount: true, feeApplied: true, year: true },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({
    members: members.map(({ payments, ...member }) => {
      const paid = paidForYear(payments, member.membershipYear);
      return {
        ...withPerson(member),
        paidAmount: paid?.fee ?? null,
        supportAmount: paid?.support ?? 0,
      };
    }),
  });
});

export const POST = withRoute("POST /api/admin/members", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const {
    accountPhone,
    fullName,
    phoneUnknown,
    age,
    village,
    paymentMethod,
    paymentProof,
    photo,
    status,
    paidAmount,
    surplusAnonymous,
  } = parse(adminMemberCreateSchema, await req.json());

  const { membershipFee, membershipYear } = await getAppSettings();

  if (!isKnownVillage(village, await villageNames())) {
    return NextResponse.json({ error: villageMessages.unknownVillage }, { status: 400 });
  }

  let paidAmountValue: number | null = null;
  if (paidAmount !== undefined && paidAmount !== null && String(paidAmount).trim() !== "") {
    const paidAmountError = validatePaidAmount(paidAmount, membershipFee);
    if (paidAmountError) return NextResponse.json({ error: paidAmountError }, { status: 400 });
    paidAmountValue = Number(paidAmount);
  }

  let userId: string | undefined;
  let tempPassword: string | undefined;
  if (!phoneUnknown) {
    const found = await prisma.user.findUnique({
      where: { phone: accountPhone!.trim() },
      select: { id: true, members: { select: { id: true }, take: 1 } },
    });
    if (found?.members.length) {
      throw new ConflictError(members.accountAlreadyHasMember);
    }
    if (found) {
      userId = found.id;
    } else {
      tempPassword = generateTempPassword();
      const hashed = await bcrypt.hash(tempPassword, 12);
      const user = await prisma.user.create({
        data: { phone: accountPhone!.trim(), password: hashed },
      });
      userId = user.id;
    }
  } else {
    const person = await prisma.user.create({
      data: { fullName, age: ageForVillage(village, age), village, photo: photo || null },
    });
    userId = person.id;
  }

  const issued = status === "ACTIVE" ? await issueMembership() : undefined;

  const member = await prisma.$transaction(async (tx) => {
    const m = await tx.member.create({
      data: {
        userId,
        paymentMethod,
        paymentProof: paymentProof || null,
        surplusAnonymous: surplusAnonymous ?? false,
        status,
        membershipYear,
      },
    });
    await recordMembershipPayment(tx, m.id, paidAmountValue, membershipFee);
    if (status === "ACTIVE") {
      await recordMembershipYear(tx, m.id, m.membershipYear, membershipFee, {
        paidAmount: paidAmountValue,
        paymentMethod: m.paymentMethod,
        paymentProof: m.paymentProof,
        recordedBy: session.username,
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        fullName,
        age: ageForVillage(village, age),
        village,
        ...(photo ? { photo } : {}),
        ...(issued ?? {}),
      },
    });
    return tx.member.findUniqueOrThrow({
      where: { id: m.id },
      include: {
        user: {
          select: { fullName: true, age: true, village: true, memberNumber: true },
        },
      },
    });
  });

  await logAction(session.username, "CREATE_MEMBER_MANUAL", nameOf(member.user), {
    ...auditContext(session, req),
    targetType: "Member",
    targetId: member.id,
    after: {
      fullName: member.user.fullName,
      age: member.user.age,
      village: member.user.village,
      paymentMethod: member.paymentMethod,
      paidAmount: member.paidAmount,
      status: member.status,
      memberNumber: member.user.memberNumber,
    },
  });

  return NextResponse.json({ member, tempPassword }, { status: 201 });
});
