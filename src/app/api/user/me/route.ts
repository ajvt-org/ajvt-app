import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { issueMembership } from "@/lib/member";
import { sendMatchReminders } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";

const MEMBER_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  age: true,
  paymentMethod: true,
  paymentProof: true,
  photo: true,
  paidAmount: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  memberNumber: true,
  verifyToken: true,
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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { members: { select: MEMBER_SELECT, orderBy: { createdAt: "asc" } } },
  });

  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  const members = await Promise.all(
    user.members.map(async (member) => {
      if (member.status === "ACTIVE" && !member.memberNumber) {
        return prisma.member.update({
          where: { id: member.id },
          data: await issueMembership(),
          select: MEMBER_SELECT,
        });
      }
      return member;
    }),
  );

  return NextResponse.json({
    phone: user.phone,
    members,
  });
});
