import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: just category labels for the age-group dropdown, not personal
// data — needed on /form's step 1, which anonymous visitors can reach
// before creating an account.
export async function GET() {
  try {
    const [ageGroups, used] = await Promise.all([
      prisma.ageGroup.findMany({ orderBy: { createdAt: "asc" }, select: { name: true } }),
      // Members can free-type a custom age on the membership form — carry
      // any such value along even if it was never added to the managed list.
      prisma.member.findMany({
        distinct: ["age"],
        orderBy: { createdAt: "asc" },
        select: { age: true },
      }),
    ]);

    const ages = ageGroups.map((g) => g.name);
    for (const { age } of used) {
      if (age && !ages.includes(age)) ages.push(age);
    }

    return NextResponse.json({ ages });
  } catch (err) {
    console.error("Ages fetch error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
