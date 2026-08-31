import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ageGroups } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/age-groups", async () => {
  await requireAdminRole("MEMBERS");
  const [ageGroups, used] = await Promise.all([
    prisma.ageGroup.findMany({ orderBy: [{ approved: "asc" }, { createdAt: "asc" }] }),
    prisma.user.findMany({ where: { memberships: { some: {} } }, select: { age: true } }),
  ]);
  const counts = new Map<string, number>();
  for (const row of used) {
    if (!row.age) continue;
    counts.set(row.age, (counts.get(row.age) ?? 0) + 1);
  }
  const known = new Set(ageGroups.map((g) => g.name));
  const orphans = [...counts.entries()]
    .filter(([name]) => !known.has(name))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  return NextResponse.json({
    ageGroups: ageGroups.map((g) => ({ ...g, count: counts.get(g.name) ?? 0 })),
    orphans,
  });
});

export const POST = withRoute("POST /api/admin/age-groups", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: ageGroups.nameRequired }, { status: 400 });
  }
  if (name.trim().length > 30) {
    return NextResponse.json({ error: ageGroups.nameTooLong }, { status: 400 });
  }

  const existing = await prisma.ageGroup.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: ageGroups.alreadyExists }, { status: 409 });
  }

  const ageGroup = await prisma.ageGroup.create({ data: { name: name.trim(), approved: true } });
  await logAction(session.username, "CREATE_AGE_GROUP", ageGroup.name);

  return NextResponse.json({ ageGroup }, { status: 201 });
});
