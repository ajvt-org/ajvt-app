import { prisma } from "./prisma";
import { logAction, type AuditDetails } from "./audit";
import { nameOf } from "./person";

export async function entriesNaming(fullName: string | null): Promise<number> {
  const name = fullName?.trim();
  if (!name) return 0;
  const pattern = `%${name}%`;
  const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "AuditLog"
    WHERE "targetLabel" ILIKE ${pattern}
       OR COALESCE("before"::text, '') ILIKE ${pattern}
       OR COALESCE("after"::text, '') ILIKE ${pattern}
       OR COALESCE("meta"::text, '') ILIKE ${pattern}
  `;
  return Number(count);
}

export async function setSupportNameConfidential(
  userId: string,
  confidential: boolean,
  by: string,
  details: AuditDetails,
): Promise<{ confidential: boolean; namedEntries: number } | null> {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, supportNameConfidential: true },
  });
  if (!account) return null;

  const namedEntries = await entriesNaming(nameOf(account));

  if (account.supportNameConfidential !== confidential) {
    await prisma.user.update({
      where: { id: userId },
      data: { supportNameConfidential: confidential },
    });
    await logAction(by, confidential ? "HIDE_SUPPORTER_NAME" : "SHOW_SUPPORTER_NAME", undefined, {
      ...details,
      targetType: "Member",
      targetId: userId,
    });
  }

  return { confidential, namedEntries };
}

export async function confidentialNames(): Promise<string[]> {
  const accounts = await prisma.user.findMany({
    where: { supportNameConfidential: true, fullName: { not: null } },
    select: { fullName: true },
  });
  return accounts
    .map((account) => nameOf(account).trim())
    .filter((name) => name.length > 0)
    .sort((a, b) => b.length - a.length);
}
