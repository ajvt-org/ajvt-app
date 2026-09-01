import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { sendMatchReminders, sendTeamChoiceReminders } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { paidForYear } from "@/lib/paidBreakdown";
import { byReviewOrder, latestByAccount } from "@/lib/currentMembership";
import { PERSON_WITH_PHONE_SELECT, withPerson } from "@/lib/person";

export const GET = withRoute("GET /api/admin/members", async () => {
  await requireAdminRole("MEMBERS");
  sendMatchReminders().catch((err) => logger.error("match.reminders.error", err));
  sendTeamChoiceReminders().catch((err) => logger.error("team.choice.reminders.error", err));

  const memberships = await prisma.membership.findMany({
    select: {
      userId: true,
      year: true,
      status: true,
      rejectionReason: true,
      paymentMethod: true,
      paymentProof: true,
      referenceCode: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          ...PERSON_WITH_PHONE_SELECT,
          registrations: {
            select: { activityId: true, activity: { select: { id: true, title: true } } },
          },
          payments: {
            where: { purpose: "MEMBERSHIP" },
            select: { amount: true, feeApplied: true, year: true },
          },
        },
      },
    },
  });

  const current = byReviewOrder([...latestByAccount(memberships).values()]);

  return NextResponse.json({
    members: current.map((membership) => {
      const { year, user, userId, ...rest } = membership;
      const { payments, registrations, ...account } = user;
      const paid = paidForYear(payments, year);
      return {
        ...withPerson({ ...rest, id: userId, userId, membershipYear: year, user: account }),
        registrations,
        paidAmount: paid?.fee ?? null,
        supportAmount: paid?.support ?? 0,
      };
    }),
  });
});
