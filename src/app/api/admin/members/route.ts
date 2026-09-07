import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { sendMatchReminders, sendTeamChoiceReminders } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { byReviewOrder, latestByAccount } from "@/lib/currentMembership";
import { PERSON_WITH_PHONE_SELECT, withPerson } from "@/lib/person";
import { feeOnly, paidForYear } from "@/lib/paidBreakdown";
import {
  MEMBERSHIP_PAYMENT_SELECT,
  mirroredColumns,
  paymentOfYear,
} from "@/lib/membershipPaymentFields";
import { CONFIDENTIAL_SELECT, seesSupporterName } from "@/lib/supportPrivacy";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute("GET /api/admin/members", async () => {
  const session = await requireAdminRole("MEMBERS");
  const viewer = viewerOf(session);
  sendMatchReminders().catch((err) => logger.error("match.reminders.error", err));
  sendTeamChoiceReminders().catch((err) => logger.error("team.choice.reminders.error", err));

  const memberships = await prisma.membership.findMany({
    select: {
      userId: true,
      year: true,
      status: true,
      rejectionReason: true,
      endedAt: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          ...PERSON_WITH_PHONE_SELECT,
          ...CONFIDENTIAL_SELECT,
          registrations: {
            select: { activityId: true, activity: { select: { id: true, title: true } } },
          },
          payments: {
            where: { purpose: "MEMBERSHIP" },
            select: MEMBERSHIP_PAYMENT_SELECT,
          },
        },
      },
    },
  });

  const current = byReviewOrder([...latestByAccount(memberships).values()]);

  return NextResponse.json({
    members: current.map((membership) => {
      const { year, user, userId, ...rest } = membership;
      const { payments, registrations, supportNameConfidential, ...account } = user;
      const named = seesSupporterName(viewer, { userId, user: { supportNameConfidential } });
      const banked = paidForYear(payments, year);
      const paid = named ? banked : feeOnly(banked);
      const mirrored = mirroredColumns(paymentOfYear(payments, year));
      return {
        ...withPerson({
          ...rest,
          ...mirrored,
          id: userId,
          userId,
          membershipYear: year,
          user: account,
        }),
        registrations,
        paidAmount: paid?.fee ?? null,
        supportAmount: paid?.support ?? 0,
      };
    }),
  });
});
