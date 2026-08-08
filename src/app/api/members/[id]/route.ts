import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true, fullName: true, phone: true, age: true, paymentMethod: true, status: true, createdAt: true },
  });

  if (!member) {
    return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
  }

  return NextResponse.json(member);
}
