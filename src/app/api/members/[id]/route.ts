import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { memberPhotoSchema } from "./schema";
import { members } from "@/lib/messages";

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
        fullName: true,
        age: true,
        paymentMethod: true,
        paymentProof: true,
        photo: true,
        paidAmount: true,
        referenceCode: true,
        status: true,
        createdAt: true,
      },
    });

    if (!member || member.userId !== session.userId) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    const { userId: _userId, ...rest } = member;
    void _userId;
    return NextResponse.json(rest);
  },
);

export const PATCH = withRoute(
  "PATCH /api/members/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await params;
    const { photo } = parse(memberPhotoSchema, await req.json());

    const existing = await prisma.member.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    const member = await prisma.member.update({
      where: { id },
      data: { photo },
      select: { id: true, photo: true },
    });

    return NextResponse.json(member);
  },
);
