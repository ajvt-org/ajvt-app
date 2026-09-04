import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { memberSelfSchema } from "./schema";
import { setSurplusVisibility } from "@/lib/membershipPaymentServer";
import { members } from "@/lib/messages";
import { PERSON_SELECT, personOf } from "@/lib/person";
import { anonymousForYear, paidForYear } from "@/lib/paidBreakdown";
import { latestMembership } from "@/lib/currentMembership";

const MEMBERSHIP_SELECT = {
  year: true,
  status: true,
  rejectionReason: true,
  paymentMethod: true,
  accountId: true,
  paymentProof: true,
  referenceCode: true,
  createdAt: true,
} as const;

const PAYMENTS_SELECT = {
  where: { purpose: "MEMBERSHIP" },
  select: { amount: true, feeApplied: true, year: true, anonymous: true },
} as const;

export const GET = withRoute(
  "GET /api/members/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await params;

    const account =
      id === session.userId
        ? await prisma.user.findUnique({
            where: { id },
            select: {
              ...PERSON_SELECT,
              payments: PAYMENTS_SELECT,
              memberships: { select: MEMBERSHIP_SELECT },
            },
          })
        : null;

    const current = account ? latestMembership(account.memberships) : null;
    if (!account || !current) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    const { year, ...rest } = current;
    const paid = paidForYear(account.payments, year);
    return NextResponse.json({
      ...personOf(account),
      ...rest,
      id,
      membershipYear: year,
      surplusAnonymous: anonymousForYear(account.payments, year),
      paidAmount: paid?.fee ?? null,
      supportAmount: paid?.support ?? 0,
    });
  },
);

export const PATCH = withRoute(
  "PATCH /api/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await params;
    const { photo, surplusAnonymous } = parse(memberSelfSchema, await req.json());

    if (id !== session.userId) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { photoLocked: true },
    });
    if (!existing) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }
    if (photo !== undefined && existing.photoLocked) {
      return NextResponse.json({ error: members.photoLocked }, { status: 403 });
    }

    if (surplusAnonymous !== undefined) {
      await prisma.$transaction((tx) => setSurplusVisibility(tx, id, surplusAnonymous));
    }
    if (photo !== undefined) {
      await prisma.user.update({ where: { id }, data: { photo } });
    }

    const account = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        photo: true,
        photoLocked: true,
        payments: PAYMENTS_SELECT,
        memberships: { select: { year: true } },
      },
    });
    const current = latestMembership(account.memberships);

    return NextResponse.json({
      id,
      surplusAnonymous: current ? anonymousForYear(account.payments, current.year) : false,
      photo: account.photo,
      photoLocked: account.photoLocked,
    });
  },
);
