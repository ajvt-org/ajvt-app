import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/age-groups", async () => {
  await requireAdminRole("MEMBERS");
  const ageGroups = await prisma.ageGroup.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ ageGroups });
});

export const POST = withRoute("POST /api/admin/age-groups", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "اسم العصر مطلوب" }, { status: 400 });
  }
  if (name.trim().length > 30) {
    return NextResponse.json({ error: "اسم العصر طويل جداً (30 حرفاً كحد أقصى)" }, { status: 400 });
  }

  const existing = await prisma.ageGroup.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "هذا العصر موجود بالفعل" }, { status: 409 });
  }

  const ageGroup = await prisma.ageGroup.create({ data: { name: name.trim() } });
  await logAction(session.username, "CREATE_AGE_GROUP", ageGroup.name);

  return NextResponse.json({ ageGroup }, { status: 201 });
});
