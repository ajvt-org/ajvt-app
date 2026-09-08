import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { asMembershipState, latestByAccount } from "@/lib/currentMembership";
import { membershipState } from "@/lib/membershipState";
import { getAppSettings } from "@/lib/settingsServer";

export const GET = withRoute("GET /api/admin/members/options", async () => {
  await requireAdminRole("MEMBERS");

  const [memberships, { membershipYear }] = await Promise.all([
    prisma.membership.findMany({
      select: {
        userId: true,
        year: true,
        status: true,
        endedAt: true,
        createdAt: true,
        user: {
          select: { fullName: true, phone: true, photo: true, age: true, village: true },
        },
      },
    }),
    getAppSettings(),
  ]);

  const current = [...latestByAccount(memberships).values()]
    .filter((row) => membershipState(asMembershipState(row), membershipYear) === "UP_TO_DATE")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return NextResponse.json({
    members: current.map(({ userId, user }) => ({
      id: userId,
      fullName: user.fullName ?? "",
      phone: user.phone,
      photo: user.photo,
      age: user.age,
      village: user.village,
    })),
  });
});
