import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateMemberNumber } from "@/lib/member";

const MEMBER_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  age: true,
  paymentMethod: true,
  paymentProof: true,
  status: true,
  createdAt: true,
  memberNumber: true,
} as const;

export async function GET() {
  try {
    const session = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { members: { select: MEMBER_SELECT, orderBy: { createdAt: "asc" } } },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const members = await Promise.all(
      user.members.map(async (member) => {
        if (member.status === "ACTIVE" && !member.memberNumber) {
          const memberNumber = await generateMemberNumber();
          return prisma.member.update({
            where: { id: member.id },
            data: { memberNumber },
            select: MEMBER_SELECT,
          });
        }
        return member;
      })
    );

    return NextResponse.json({
      phone: user.phone,
      members,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
