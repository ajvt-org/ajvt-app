import { prisma } from "@/lib/prisma";
import { nameOf } from "./person";
import { donorNameOnRecord } from "./donorName";

export type ProofReuse = {
  kind: "member" | "donation" | "expense";
  id: string;
  label: string;
  date: Date;
};

export async function findProofReuse(
  filename: string | null | undefined,
  ignore?: { kind: ProofReuse["kind"]; id: string },
): Promise<ProofReuse[]> {
  if (!filename) return [];

  const mine = await prisma.proofImage.findUnique({ where: { filename } });
  if (!mine) return [];

  const sameImage = await prisma.proofImage.findMany({
    where: { sha256: mine.sha256, filename: { not: filename } },
    select: { filename: true },
  });
  if (sameImage.length === 0) return [];

  const names = sameImage.map((row) => row.filename);
  const [members, donations, expenses] = await Promise.all([
    prisma.membership.findMany({
      where: { paymentProof: { in: names } },
      select: {
        createdAt: true,
        user: { select: { fullName: true, members: { select: { id: true }, take: 1 } } },
      },
    }),
    prisma.donation.findMany({
      where: { proof: { in: names } },
      select: {
        id: true,
        donorName: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
    }),
    prisma.expense.findMany({
      where: { proof: { in: names } },
      select: { id: true, label: true, date: true },
    }),
  ]);

  const found: ProofReuse[] = [
    ...members.flatMap((m) =>
      m.user.members.length === 0
        ? []
        : [
            {
              kind: "member" as const,
              id: m.user.members[0].id,
              label: nameOf(m.user),
              date: m.createdAt,
            },
          ],
    ),
    ...donations.map((d) => ({
      kind: "donation" as const,
      id: d.id,
      label: donorNameOnRecord(d),
      date: d.createdAt,
    })),
    ...expenses.map((e) => ({
      kind: "expense" as const,
      id: e.id,
      label: e.label,
      date: e.date,
    })),
  ];

  return found
    .filter((row) => !(ignore && row.kind === ignore.kind && row.id === ignore.id))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
