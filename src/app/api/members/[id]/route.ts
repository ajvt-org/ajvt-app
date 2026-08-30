import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { memberSelfSchema } from "./schema";
import { setSurplusVisibility } from "@/lib/membershipPaymentServer";
import { members } from "@/lib/messages";
import { PERSON_SELECT, withPerson } from "@/lib/person";
import { anonymousForYear, paidForYear } from "@/lib/paidBreakdown";

export const GET = withRoute(
  "GET /api/members/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            ...PERSON_SELECT,
            payments: {
              where: { purpose: "MEMBERSHIP" },
              select: { amount: true, feeApplied: true, year: true, anonymous: true },
            },
          },
        },
        paymentMethod: true,
        paymentProof: true,
        membershipYear: true,
        referenceCode: true,
        status: true,
        createdAt: true,
      },
    });

    if (!member || member.userId !== session.userId) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    const { payments, ...account } = member.user;
    const { userId: _userId, ...rest } = withPerson({ ...member, user: account });
    void _userId;
    const paid = paidForYear(payments, rest.membershipYear);
    return NextResponse.json({
      ...rest,
      surplusAnonymous: anonymousForYear(payments, rest.membershipYear),
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

    const existing = await prisma.member.findUnique({
      where: { id },
      select: { userId: true, user: { select: { photoLocked: true } } },
    });
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }
    if (photo !== undefined && existing.user.photoLocked) {
      return NextResponse.json({ error: members.photoLocked }, { status: 403 });
    }

    if (surplusAnonymous !== undefined) {
      await prisma.$transaction((tx) => setSurplusVisibility(tx, id, surplusAnonymous));
    }
    if (photo !== undefined) {
      await prisma.user.update({ where: { id: existing.userId }, data: { photo } });
    }

    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        membershipYear: true,
        user: {
          select: {
            photo: true,
            photoLocked: true,
            payments: {
              where: { purpose: "MEMBERSHIP" },
              select: { amount: true, feeApplied: true, year: true, anonymous: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      member && {
        id: member.id,
        surplusAnonymous: anonymousForYear(member.user.payments, member.membershipYear),
        photo: member.user.photo,
        photoLocked: member.user.photoLocked,
      },
    );
  },
);
