import * as bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { ConflictError, ValidationError } from "./errors";
import { accounts, villages as villageMessages } from "./messages";
import { ageForVillage, isKnownVillage } from "./villages";
import { villageNames } from "./villagesServer";
import { generateTempPassword } from "./tempPassword";
import { requireOwnUpload } from "./uploadOwnerServer";

const ROUNDS = 12;

export interface NewPerson {
  accountPhone?: string | null;
  phoneUnknown?: unknown;
  fullName: string;
  age?: string | null;
  village: string;
  photo?: string | null;
}

export async function createPerson(input: NewPerson, adminId: string) {
  if (!isKnownVillage(input.village, await villageNames())) {
    throw new ValidationError(villageMessages.unknownVillage);
  }

  await requireOwnUpload(input.photo, { userId: null, adminId });

  const phone = input.phoneUnknown ? null : input.accountPhone!.trim();
  if (phone && (await prisma.user.count({ where: { phone } }))) {
    throw new ConflictError(accounts.phoneTaken);
  }

  const tempPassword = phone ? generateTempPassword() : undefined;

  const person = await prisma.user.create({
    data: {
      phone,
      password: tempPassword ? await bcrypt.hash(tempPassword, ROUNDS) : null,
      fullName: input.fullName,
      age: ageForVillage(input.village, input.age),
      village: input.village,
      photo: input.photo || null,
    },
    select: { id: true, phone: true, fullName: true, age: true, village: true },
  });

  return { person, tempPassword, phone };
}
