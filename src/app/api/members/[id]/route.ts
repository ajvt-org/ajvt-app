import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
