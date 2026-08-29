import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { memberSelfSchema } from "./schema";
import { setSurplusVisibility } from "@/lib/membershipPaymentServer";
import { members } from "@/lib/messages";
import { withPerson } from "@/lib/person";

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
            fullName: true,
            age: true,
            village: true,
            photo: true,
            memberNumber: true,
            verifyToken: true,
          },
        },
        paymentMethod: true,
        paymentProof: true,
        paidAmount: true,
        surplusAnonymous: true,
        referenceCode: true,
        status: true,
        createdAt: true,
      },
    });

    if (!member || member.userId !== session.userId) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    const { userId: _userId, ...rest } = withPerson(member);
    void _userId;
    return NextResponse.json(rest);
  },
);

export const PATCH = withRoute(
  "PATCH /api/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await params;
    const { photo, surplusAnonymous } = parse(memberSelfSchema, await req.json());

    const existing = await prisma.member.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    if (surplusAnonymous !== undefined) {
      await prisma.$transaction((tx) => setSurplusVisibility(tx, id, surplusAnonymous));
    }
    if (photo !== undefined) {
      await prisma.member.update({ where: { id }, data: { photo } });
    }

    const member = await prisma.member.findUnique({
      where: { id },
      select: { id: true, surplusAnonymous: true, user: { select: { photo: true } } },
    });

    return NextResponse.json(member && { ...member, photo: member.user.photo });
  },
);
