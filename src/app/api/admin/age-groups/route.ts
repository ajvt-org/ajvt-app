import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";

// Orphans are age values members hold that match no group. They are left
// over from renames made before the rename started reaching members, and
// nothing else in the admin panel can see them.
export const GET = withRoute("GET /api/admin/age-groups", async () => {
  await requireAdminRole("MEMBERS");
  const [ageGroups, used] = await Promise.all([
    prisma.ageGroup.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.member.groupBy({ by: ["age"], _count: { _all: true } }),
  ]);
  const known = new Set(ageGroups.map((g) => g.name));
  const orphans = used
    .filter((row) => row.age && !known.has(row.age))
    .map((row) => ({ name: row.age, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
  return NextResponse.json({ ageGroups, orphans });
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
