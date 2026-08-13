import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();

    const [ageGroups, used] = await Promise.all([
      prisma.ageGroup.findMany({ orderBy: { createdAt: "asc" }, select: { name: true } }),
      // Members can free-type a custom age on the membership form — carry
      // any such value along even if it was never added to the managed list.
      prisma.member.findMany({ distinct: ["age"], orderBy: { createdAt: "asc" }, select: { age: true } }),
    ]);

    const ages = ageGroups.map((g) => g.name);
    for (const { age } of used) {
      if (age && !ages.includes(age)) ages.push(age);
    }

    return NextResponse.json({ ages });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
