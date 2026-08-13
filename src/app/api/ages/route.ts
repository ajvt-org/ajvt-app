import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_AGES = [
  "البدريين",
  "الفائزين",
  "النجميين",
  "المجاهدين",
  "المنصورين",
  "الخاشعين",
  "التائبين",
];

// Public: just category labels for the age-group dropdown, not personal
// data — needed on /form's step 1, which anonymous visitors can now reach
// before creating an account.
export async function GET() {
  try {
    const used = await prisma.member.findMany({
      distinct: ["age"],
      orderBy: { createdAt: "asc" },
      select: { age: true },
    });

    const ages = [...DEFAULT_AGES];
    for (const { age } of used) {
      if (age && !ages.includes(age)) ages.push(age);
    }

    return NextResponse.json({ ages });
  } catch (err) {
    console.error("Ages fetch error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
