import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { issueMembership, generateTempPassword } from "@/lib/member";
import { logAction, auditContext } from "@/lib/audit";
import * as bcrypt from "bcryptjs";
import { sendMatchReminders } from "@/lib/tournamentNotify";
import { validatePaidAmount } from "@/lib/donations";
import { getAppSettings } from "@/lib/settingsServer";
import { syncMembershipDonation } from "@/lib/donationsServer";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { parse } from "@/lib/validation";
import { adminMemberCreateSchema } from "./schema";

export const GET = withRoute("GET /api/admin/members", async () => {
  await requireAdminRole("MEMBERS");
  sendMatchReminders().catch((err) => logger.error("match.reminders.error", err));
  const members = await prisma.member.findMany({
    include: {
      user: { select: { phone: true } },
      registrations: {
        select: { activityId: true, activity: { select: { id: true, title: true } } },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ members });
});

export const POST = withRoute("POST /api/admin/members", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const {
    accountPhone,
    fullName,
    memberPhone,
    phoneUnknown,
    age,
    paymentMethod,
    paymentProof,
    photo,
    status,
    paidAmount,
  } = parse(adminMemberCreateSchema, await req.json());

  let paidAmountValue: number | null = null;
  if (paidAmount !== undefined && paidAmount !== null && String(paidAmount).trim() !== "") {
    const paidAmountError = validatePaidAmount(paidAmount, (await getAppSettings()).membershipFee);
    if (paidAmountError) return NextResponse.json({ error: paidAmountError }, { status: 400 });
    paidAmountValue = Number(paidAmount);
  }

  let userId: string | null = null;
  let tempPassword: string | undefined;
  if (!phoneUnknown) {
    let user = await prisma.user.findUnique({ where: { phone: accountPhone!.trim() } });
    if (!user) {
      tempPassword = generateTempPassword();
      const hashed = await bcrypt.hash(tempPassword, 12);
      user = await prisma.user.create({
        data: { phone: accountPhone!.trim(), password: hashed },
      });
    }
    userId = user.id;
  }

  const issued = status === "ACTIVE" ? await issueMembership() : undefined;

  const member = await prisma.$transaction(async (tx) => {
    const m = await tx.member.create({
      data: {
        userId,
        fullName,
        phone: phoneUnknown ? null : memberPhone!.trim(),
        age,
        paymentMethod,
        paymentProof: paymentProof || null,
        photo: photo || null,
        paidAmount: paidAmountValue,
        status,
        ...(issued ?? {}),
      },
    });
    await syncMembershipDonation(tx, m.id);
    return m;
  });

  await logAction(session.username, "CREATE_MEMBER_MANUAL", member.fullName, {
    ...auditContext(session, req),
    targetType: "Member",
    targetId: member.id,
    after: {
      fullName: member.fullName,
      phone: member.phone,
      age: member.age,
      paymentMethod: member.paymentMethod,
      paidAmount: member.paidAmount,
      status: member.status,
      memberNumber: member.memberNumber,
    },
  });

  return NextResponse.json({ member, tempPassword }, { status: 201 });
});
