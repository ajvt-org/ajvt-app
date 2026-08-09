import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateMemberNumber } from "@/lib/member";

export async function GET() {
  try {
    const session = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            age: true,
            paymentMethod: true,
            paymentProof: true,
            status: true,
            createdAt: true,
            memberNumber: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    let member = user.member;
    if (member && member.status === "ACTIVE" && !member.memberNumber) {
      const memberNumber = await generateMemberNumber();
      member = await prisma.member.update({
        where: { id: member.id },
        data: { memberNumber },
        select: {
          id: true,
          fullName: true,
          phone: true,
          age: true,
          paymentMethod: true,
          paymentProof: true,
          status: true,
          createdAt: true,
          memberNumber: true,
        },
      });
    }

    return NextResponse.json({
      phone: user.phone,
      member: member || null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
