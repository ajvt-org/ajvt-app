import { prisma } from "./prisma";
import { getUserSession } from "./auth";
import { latestMembership } from "./currentMembership";

export async function getViewerAge(): Promise<string | null> {
  const session = await getUserSession();
  if (!session) return null;

  const { userId } = session as { userId: string };
  const rows = await prisma.membership.findMany({
    where: { userId },
    select: { year: true, status: true, user: { select: { age: true } } },
  });
  const current = latestMembership(rows);

  return current?.status === "ACTIVE" ? (current.user.age ?? null) : null;
}
