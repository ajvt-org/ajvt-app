import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { asMembershipState, latestByAccount } from "./currentMembership";
import { holdsMembership, membershipState } from "./membershipState";
import { getAppSettings } from "./settingsServer";

export interface Audience {
  target: "ALL" | "ACTIVITY" | "AGE";
  activityId?: string | null;
  age?: string | null;
}

export async function broadcastAudience(audience: Audience): Promise<string[]> {
  const where: Prisma.MembershipWhereInput = {};
  if (audience.target === "ACTIVITY") {
    where.user = { registrations: { some: { activityId: audience.activityId! } } };
  }
  if (audience.target === "AGE") where.user = { age: audience.age!.trim() };

  const [rows, { membershipYear }] = await Promise.all([
    prisma.membership.findMany({
      where,
      select: { userId: true, year: true, status: true, endedAt: true },
    }),
    getAppSettings(),
  ]);

  return [...latestByAccount(rows).values()]
    .filter((row) => holdsMembership(membershipState(asMembershipState(row), membershipYear)))
    .map((row) => row.userId);
}
