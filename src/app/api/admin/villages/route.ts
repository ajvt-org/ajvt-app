import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { villages } from "@/lib/messages";
import { OTHER_VILLAGE, VILLAGE_NAME_MAX, isReservedVillageName } from "@/lib/villages";

export const GET = withRoute("GET /api/admin/villages", async () => {
  await requireAdminRole("MEMBERS");
  const [rows, used] = await Promise.all([
    prisma.village.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.member.groupBy({ by: ["village"], _count: { _all: true } }),
  ]);
  const counts = new Map(used.map((row) => [row.village, row._count._all]));
  const known = new Set(rows.map((row) => row.name));
  const unlisted = used
    .filter((row) => row.village !== OTHER_VILLAGE && !known.has(row.village))
    .map((row) => ({ name: row.village, count: row._count._all }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    villages: rows.map((row) => ({ ...row, count: counts.get(row.name) ?? 0 })),
    otherCount: counts.get(OTHER_VILLAGE) ?? 0,
    unlisted,
  });
});

export const POST = withRoute("POST /api/admin/villages", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { name } = await req.json();
  const trimmed = String(name ?? "").trim();

  if (!trimmed) {
    return NextResponse.json({ error: villages.nameRequired }, { status: 400 });
  }
  if (trimmed.length > VILLAGE_NAME_MAX) {
    return NextResponse.json({ error: villages.nameTooLong }, { status: 400 });
  }
  if (isReservedVillageName(trimmed)) {
    return NextResponse.json({ error: villages.reservedName }, { status: 400 });
  }

  const existing = await prisma.village.findUnique({ where: { name: trimmed } });
  if (existing) {
    return NextResponse.json({ error: villages.alreadyExists }, { status: 409 });
  }

  const village = await prisma.village.create({ data: { name: trimmed } });
  await logAction(session.username, "CREATE_VILLAGE", village.name);

  return NextResponse.json({ village }, { status: 201 });
});
