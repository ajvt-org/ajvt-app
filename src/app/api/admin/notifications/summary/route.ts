import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const [pendingMembers, pendingTeamRequests] = await Promise.all([
      prisma.member.count({ where: { status: "PENDING" } }),
      prisma.teamMember.count({ where: { status: "PENDING" } }),
    ]);
    return NextResponse.json({ pendingMembers, pendingTeamRequests });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
