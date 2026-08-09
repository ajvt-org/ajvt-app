import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, action } = await req.json();

    if (!id || !["ACTIVE", "REJECTED"].includes(action)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const updated = await prisma.member.update({
      where: { id },
      data: { status: action },
    });

    return NextResponse.json({ member: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Validate error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
