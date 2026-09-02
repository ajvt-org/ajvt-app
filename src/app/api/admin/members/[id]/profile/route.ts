import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { isOwner } from "@/lib/adminRoles";
import { entriesNaming } from "@/lib/supportPrivacyServer";
import { withRoute } from "@/lib/route";
import { members as messages } from "@/lib/messages";
import { paidForYear } from "@/lib/paidBreakdown";
import { latestMembership } from "@/lib/currentMembership";
import { PERSON_WITH_PHONE_SELECT, personOf } from "@/lib/person";

export const GET = withRoute(
  "GET /api/admin/members/[id]/profile",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;

    const account = await prisma.user.findUnique({
      where: { id },
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
        supportNameConfidential: true,
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
    });

    if (!account) return NextResponse.json({ error: messages.notFound }, { status: 404 });

    const {
      registrations,
      teamMemberships,
      payments,
      donations,
      memberships,
      supportNameConfidential,
      ...person
    } = account;
    const current = latestMembership(memberships);
    if (!current) return NextResponse.json({ error: messages.notFound }, { status: 404 });
    const { year, ...membership } = current;

    const history = await prisma.auditLog.findMany({
      where: { targetType: "Member", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, action: true, adminUsername: true, createdAt: true, targetLabel: true },
    });

    const supportPrivacy = isOwner(session.role)
      ? {
          confidential: supportNameConfidential,
          namedEntries: await entriesNaming(person.fullName),
        }
      : null;

    return NextResponse.json({
      member: {
        ...personOf(person),
        ...membership,
        id,
        user: { id: person.id, phone: person.phone, createdAt: person.createdAt },
        membershipYear: year,
        registrations,
        teamMemberships,
        donations,
        paidAmount: paidForYear(payments, year)?.fee ?? null,
        supportAmount: paidForYear(payments, year)?.support ?? 0,
      },
      supportPrivacy,
      history,
    });
  },
);
