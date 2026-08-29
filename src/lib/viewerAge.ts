import { prisma } from "./prisma";
import { getUserSession } from "./auth";

export async function getViewerAge(): Promise<string | null> {
  const session = await getUserSession();
  if (!session) return null;

  const { userId } = session as { userId: string };
  const member = await prisma.member.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { user: { select: { age: true } } },
  });

  return member?.user.age ?? null;
}
