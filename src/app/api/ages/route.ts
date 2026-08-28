import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/ages", async () => {
  const ageGroups = await prisma.ageGroup.findMany({
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });

  return NextResponse.json({ ages: ageGroups.map((group) => group.name) });
});
