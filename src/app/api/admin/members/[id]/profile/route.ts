import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { isOwner } from "@/lib/adminRoles";
import { entriesNaming } from "@/lib/supportPrivacyServer";
import { withRoute } from "@/lib/route";
import { members as messages } from "@/lib/messages";
import { feeOnly, paidForYear } from "@/lib/paidBreakdown";
import { seesSupporterName } from "@/lib/supportPrivacy";
import { viewerOf } from "@/lib/supportViewer";
import { latestMembership } from "@/lib/currentMembership";
import { paymentOfYear } from "@/lib/membershipPaymentFields";
import { PERSON_WITH_PHONE_SELECT, personOf } from "@/lib/person";
import { memberGifts } from "@/lib/gifts";
import { getAppSettings } from "@/lib/settingsServer";

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
            endedAt: true,
            endedReason: true,
            endedBy: true,
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
          select: {
            id: true,
            purpose: true,
            amount: true,
            feeApplied: true,
            year: true,
            status: true,
            source: true,
            method: true,
            accountId: true,
            account: { select: { id: true, code: true, label: true } },
            proof: true,
            referenceCode: true,
            paidOn: true,
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

    const { membershipYear: currentYear } = await getAppSettings();

    const named = seesSupporterName(viewerOf(session), {
      userId: id,
      user: { supportNameConfidential },
    });
    const membershipPayments = payments.filter((row) => row.purpose === "MEMBERSHIP");
    const banked = paidForYear(membershipPayments, year);
    const paid = named ? banked : feeOnly(banked);
    const payment = paymentOfYear(membershipPayments, year);

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
        paymentMethod: payment?.method ?? null,
        accountId: payment?.accountId ?? null,
        account: payment?.account ?? null,
        paymentProof: payment?.proof ?? null,
        referenceCode: payment?.referenceCode ?? null,
        paymentPaidOn: payment?.paidOn ?? null,
        paymentRecordedAt: payment?.createdAt ?? null,
        id,
        user: { id: person.id, phone: person.phone, createdAt: person.createdAt },
        membershipYear: year,
        registrations,
        teamMemberships,
        donations: named ? memberGifts(payments) : [],
        paidAmount: paid?.fee ?? null,
        supportAmount: paid?.support ?? 0,
      },
      supportPrivacy,
      history,
      currentYear,
    });
  },
);
