import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdminRole("MEMBERS");
    const ageGroups = await prisma.ageGroup.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ ageGroups });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN")
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    console.error("Age groups list error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole("MEMBERS");
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم العصر مطلوب" }, { status: 400 });
    }
    if (name.trim().length > 30) {
      return NextResponse.json(
        { error: "اسم العصر طويل جداً (30 حرفاً كحد أقصى)" },
        { status: 400 },
      );
    }

    const existing = await prisma.ageGroup.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: "هذا العصر موجود بالفعل" }, { status: 409 });
    }

    const ageGroup = await prisma.ageGroup.create({ data: { name: name.trim() } });
    await logAction(session.username, "CREATE_AGE_GROUP", ageGroup.name);

    return NextResponse.json({ ageGroup }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN")
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    console.error("Age group create error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
