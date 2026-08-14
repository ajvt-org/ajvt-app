import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        fullName: true,
        phone: true,
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
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }

    const { userId: _userId, ...rest } = member;
    void _userId;
    return NextResponse.json(rest);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await params;
    const { photo } = await req.json();

    if (photo !== null && typeof photo !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const existing = await prisma.member.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }

    const member = await prisma.member.update({
      where: { id },
      data: { photo },
      select: { id: true, photo: true },
    });

    return NextResponse.json(member);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Member photo update error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
