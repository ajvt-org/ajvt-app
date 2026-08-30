import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { members as messages } from "@/lib/messages";
import { paidForYear } from "@/lib/paidBreakdown";
import { PERSON_WITH_PHONE_SELECT, withPerson } from "@/lib/person";

export const GET = withRoute(
  "GET /api/admin/members/[id]/profile",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            createdAt: true,
            ...PERSON_WITH_PHONE_SELECT,
            registrations: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                status: true,
                rejectionReason: true,
                createdAt: true,
                activity: { select: { id: true, title: true, startsAt: true } },
              },
            },
            teamMemberships: {
              select: {
                status: true,
                team: {
                  select: { id: true, name: true, activity: { select: { id: true, title: true } } },
                },
              },
            },
            payments: {
              where: { purpose: "MEMBERSHIP" },
              select: { amount: true, feeApplied: true, year: true },
            },
            donations: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                amount: true,
                status: true,
                source: true,
                membershipYear: true,
                paymentMethod: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!member) return NextResponse.json({ error: messages.notFound }, { status: 404 });

    const { registrations, teamMemberships, payments, donations, ...account } = member.user;

    const history = await prisma.auditLog.findMany({
      where: { targetType: "Member", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, action: true, adminUsername: true, createdAt: true, targetLabel: true },
    });

    return NextResponse.json({
      member: {
        ...withPerson({ ...member, user: account }),
        registrations,
        teamMemberships,
        donations,
        paidAmount: paidForYear(payments, member.membershipYear)?.fee ?? null,
        supportAmount: paidForYear(payments, member.membershipYear)?.support ?? 0,
      },
      history,
    });
  },
);
