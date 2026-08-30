import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { members as messages } from "@/lib/messages";
import { paidForYear } from "@/lib/paidBreakdown";
import { latestMembership } from "@/lib/currentMembership";
import { PERSON_WITH_PHONE_SELECT, withPerson } from "@/lib/person";

export const GET = withRoute(
  "GET /api/admin/members/[id]/profile",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            createdAt: true,
            memberships: {
              select: {
                year: true,
                status: true,
                rejectionReason: true,
                paymentMethod: true,
                paymentProof: true,
                referenceCode: true,
                createdAt: true,
                updatedAt: true,
              },
            },
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

    const { registrations, teamMemberships, payments, donations, memberships, ...account } =
      member.user;
    const current = latestMembership(memberships);
    if (!current) return NextResponse.json({ error: messages.notFound }, { status: 404 });
    const { year, ...membership } = current;

    const history = await prisma.auditLog.findMany({
      where: { targetType: "Member", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, action: true, adminUsername: true, createdAt: true, targetLabel: true },
    });

    return NextResponse.json({
      member: {
        ...withPerson({ ...member, ...membership, membershipYear: year, user: account }),
        registrations,
        teamMemberships,
        donations,
        paidAmount: paidForYear(payments, year)?.fee ?? null,
        supportAmount: paidForYear(payments, year)?.support ?? 0,
      },
      history,
    });
  },
);
