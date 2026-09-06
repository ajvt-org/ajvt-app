import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { latestByAccount } from "@/lib/currentMembership";

export const GET = withRoute("GET /api/admin/members/options", async () => {
  await requireAdminRole("MEMBERS");

  const memberships = await prisma.membership.findMany({
    select: {
      userId: true,
      year: true,
      status: true,
      createdAt: true,
      user: {
        select: { fullName: true, phone: true, photo: true, age: true, village: true },
      },
    },
  });

  const current = [...latestByAccount(memberships).values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return NextResponse.json({
    members: current.map(({ userId, status, user }) => ({
      id: userId,
      fullName: user.fullName ?? "",
      phone: user.phone,
      photo: user.photo,
      age: user.age,
      village: user.village,
      status,
    })),
  });
});
