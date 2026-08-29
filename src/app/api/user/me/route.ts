import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { issueMembership } from "@/lib/member";
import { sendMatchReminders } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { paidForYear } from "@/lib/paidBreakdown";
import { PERSON_WITH_PHONE_SELECT, personOf } from "@/lib/person";
import { getAppSettings } from "@/lib/settingsServer";

const MEMBER_SELECT = {
  id: true,
  paymentMethod: true,
  paymentProof: true,
  paidAmount: true,
  surplusAnonymous: true,
  membershipYear: true,
  payments: {
    where: { purpose: "MEMBERSHIP" },
    select: { amount: true, feeApplied: true, year: true },
  },
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  registrations: {
    select: {
      id: true,
      activityId: true,
      status: true,
      rejectionReason: true,
      activity: { select: { id: true, title: true } },
    },
  },
  teamMemberships: {
    select: { status: true, team: { select: { id: true, name: true, activityId: true } } },
  },
} as const;

export const GET = withRoute("GET /api/user/me", async () => {
  const session = await requireUser();

  sendMatchReminders().catch((err) => logger.error("match.reminders.error", err));

  const { membershipYear: currentYear } = await getAppSettings();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      ...PERSON_WITH_PHONE_SELECT,
      members: { select: MEMBER_SELECT, orderBy: { createdAt: "asc" } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  let person = personOf(user);
  if (!user.memberNumber && user.members.some((member) => member.status === "ACTIVE")) {
    const issued = await issueMembership();
    await prisma.user.update({ where: { id: session.userId }, data: issued });
    person = { ...person, ...issued };
  }

  return NextResponse.json({
    ...person,
    phone: user.phone,
    currentYear,
    members: user.members.map(({ payments, ...member }) => {
      const paid = paidForYear(payments, member.membershipYear);
      return {
        ...member,
        ...person,
        user: { phone: user.phone },
        paidAmount: paid?.fee ?? null,
        supportAmount: paid?.support ?? 0,
      };
    }),
  });
});
