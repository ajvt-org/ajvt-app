import * as bcrypt from "bcryptjs";
import type { Prisma, PrismaClient } from "@prisma/client";
import { generateTempPassword, issueMembership } from "./member";
import { addMembership } from "./membershipCreate";
import { ageForVillage } from "./villages";
import type { RowValues } from "./memberImportValues";

type Db = PrismaClient | Prisma.TransactionClient;

export type RowOutcome = "created" | "updated" | "failed";

export interface ImportedRow {
  row: number;
  outcome: RowOutcome;
  fullName: string;
  phone: string;
  personId?: string;
  tempPassword?: string;
  membership: boolean;
  error?: string;
}

export interface RunSettings {
  membershipYear: number;
  membershipFee: number;
  recordedBy: string;
}

async function payFor(db: Db, userId: string, values: RowValues, settings: RunSettings) {
  const account = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { memberNumber: true },
  });

  await addMembership(db, {
    userId,
    paymentMethod: values.paymentMethod.trim(),
    paymentProof: null,
    paidAmount: values.paidAmount ? Number(values.paidAmount) : settings.membershipFee,
    surplusAnonymous: false,
    status: "ACTIVE",
    membershipYear: settings.membershipYear,
    fee: settings.membershipFee,
    recordedBy: settings.recordedBy,
    issued: account.memberNumber ? undefined : await issueMembership(db),
  });
}

export interface Credential {
  tempPassword?: string;
  hash: string | null;
}

export async function credentialFor(phone: string): Promise<Credential> {
  if (!phone) return { hash: null };
  const tempPassword = generateTempPassword();
  return { tempPassword, hash: await bcrypt.hash(tempPassword, 12) };
}

export async function createFromRow(
  db: Db,
  values: RowValues,
  credential: Credential,
  settings: RunSettings,
): Promise<{ personId: string; tempPassword?: string; membership: boolean }> {
  const person = await db.user.create({
    data: {
      phone: values.phone || null,
      password: credential.hash,
      fullName: values.fullName,
      age: ageForVillage(values.village, values.age),
      village: values.village,
    },
    select: { id: true },
  });

  if (values.paid) await payFor(db, person.id, values, settings);

  return {
    personId: person.id,
    tempPassword: credential.tempPassword,
    membership: values.paid,
  };
}

export async function updateFromRow(
  db: Db,
  personId: string,
  values: RowValues,
  settings: RunSettings,
): Promise<{ membership: boolean }> {
  await db.user.update({
    where: { id: personId },
    data: {
      fullName: values.fullName,
      age: ageForVillage(values.village, values.age),
      village: values.village,
    },
  });

  if (!values.paid) return { membership: false };

  const held = await db.membership.findFirst({
    where: { userId: personId, year: settings.membershipYear },
    select: { id: true },
  });
  if (held) return { membership: false };

  await payFor(db, personId, values, settings);
  return { membership: true };
}
