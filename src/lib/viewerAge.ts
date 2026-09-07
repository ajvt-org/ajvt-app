import { prisma } from "./prisma";
import { getUserSession } from "./auth";
import { asMembershipState, latestMembership } from "./currentMembership";
import { holdsMembership, membershipState } from "./membershipState";
import { getAppSettings } from "./settingsServer";

export async function getViewerAge(): Promise<string | null> {
  const session = await getUserSession();
  if (!session) return null;

  const { userId } = session as { userId: string };
  const [rows, { membershipYear }] = await Promise.all([
    prisma.membership.findMany({
      where: { userId },
      select: { year: true, status: true, endedAt: true, user: { select: { age: true } } },
    }),
    getAppSettings(),
  ]);
  const current = latestMembership(rows);
  if (!holdsMembership(membershipState(asMembershipState(current), membershipYear))) return null;

  return current?.user.age ?? null;
}
