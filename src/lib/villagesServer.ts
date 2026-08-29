import { prisma } from "./prisma";

export function renameMemberVillage(from: string, to: string) {
  return prisma.$executeRaw`UPDATE "User" SET "village" = ${to} WHERE "village" = ${from}`;
}

export async function villageNames(): Promise<string[]> {
  const rows = await prisma.village.findMany({
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });
  return rows.map((row) => row.name);
}
