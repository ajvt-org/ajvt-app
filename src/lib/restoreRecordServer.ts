import { prisma } from "./prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { accounts } from "./messages";
import { archivedMembership } from "./archivedMembership";
import { restoreElection } from "./electionArchiveServer";

export interface Restored {
  kind: "Member" | "User" | "Election";
  label: string;
  recordId: string;
  phone: unknown;
}

async function restoreMembership(id: string, recordId: string, data: Record<string, unknown>) {
  const existing = await prisma.membership.findFirst({ where: { userId: recordId } });
  if (existing) throw new ConflictError(accounts.memberExists);

  const account = await prisma.user.findUnique({ where: { id: String(data.userId) } });
  if (!account) throw new ConflictError(accounts.restoreAccountFirst);

  const { memberships } = data as { memberships?: Record<string, unknown>[] };
  if (!memberships) throw new ConflictError(accounts.archivePredatesTheRecord);

  await prisma.$transaction([
    prisma.membership.createMany({
      data: memberships.map(archivedMembership),
      skipDuplicates: true,
    }),
    prisma.deletedRecord.delete({ where: { id } }),
  ]);
}

async function restoreAccount(id: string, recordId: string, data: Record<string, unknown>) {
  const taken = await prisma.user.findFirst({
    where: { OR: [{ id: recordId }, { phone: String(data.phone) }] },
  });
  if (taken) throw new ConflictError(accounts.phoneTaken);

  const { payments: _payments, ...fields } = data;
  void _payments;

  await prisma.$transaction([
    prisma.user.create({ data: fields as never }),
    prisma.deletedRecord.delete({ where: { id } }),
  ]);
}

export async function restoreDeletedRecord(
  id: string,
  allowed: (kind: string) => boolean = () => true,
): Promise<Restored> {
  const record = await prisma.deletedRecord.findUnique({ where: { id } });
  if (!record) throw new NotFoundError(accounts.deletedRecordNotFound);
  if (!allowed(record.kind)) throw new ForbiddenError();

  const data = record.data as Record<string, unknown>;

  if (record.kind === "Member") {
    await restoreMembership(id, record.recordId, data);
  } else if (record.kind === "User") {
    await restoreAccount(id, record.recordId, data);
  } else if (record.kind === "Election") {
    await restoreElection(id, record.recordId, data);
  } else {
    throw new ConflictError(accounts.restoreKindNotSupported);
  }

  return {
    kind: record.kind as Restored["kind"],
    label: record.label,
    recordId: record.recordId,
    phone: data.phone ?? null,
  };
}
