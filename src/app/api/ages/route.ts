import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const DEFAULT_AGES = [
  "البدريين",
  "الفائزين",
  "النجميين",
  "المجاهدين",
  "المنصورين",
  "الخاشعين",
  "التائبين",
];

export async function GET() {
  try {
    await requireUser();

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
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
