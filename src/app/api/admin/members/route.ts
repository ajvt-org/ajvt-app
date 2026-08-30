import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { sendMatchReminders } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { paidForYear } from "@/lib/paidBreakdown";
import { PERSON_WITH_PHONE_SELECT, withPerson } from "@/lib/person";

export const GET = withRoute("GET /api/admin/members", async () => {
  await requireAdminRole("MEMBERS");
  sendMatchReminders().catch((err) => logger.error("match.reminders.error", err));
  const members = await prisma.member.findMany({
    include: {
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
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({
    members: members.map((member) => {
      const { payments, registrations, ...account } = member.user;
      const paid = paidForYear(payments, member.membershipYear);
      return {
        ...withPerson({ ...member, user: account }),
        registrations,
        paidAmount: paid?.fee ?? null,
        supportAmount: paid?.support ?? 0,
      };
    }),
  });
});
