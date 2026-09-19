import * as bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { ConflictError, ValidationError } from "./errors";
import { auth, villages as messages } from "./messages";
import { ageForVillage, isKnownVillage } from "./villages";
import { villageNames } from "./villagesServer";
import { suggestAgeGroup } from "./ageGroups";
import { ANONYMOUS_UPLOADER, requireOwnUpload } from "./uploadOwnerServer";

const ROUNDS = 12;

export interface Registration {
  phone: string;
  password: string;
  fullName: string;
  village: string;
  age?: string | null;
  photo?: string | null;
}

export async function registerMember(input: Registration) {
  if (!isKnownVillage(input.village, await villageNames())) {
    throw new ValidationError(messages.unknownVillage);
  }

  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing) throw new ConflictError(auth.phoneTaken);

  await requireOwnUpload(input.photo, ANONYMOUS_UPLOADER);

  const age = ageForVillage(input.village, input.age);
  const user = await prisma.user.create({
    data: {
      phone: input.phone,
      password: await bcrypt.hash(input.password, ROUNDS),
      fullName: input.fullName,
      village: input.village,
      age,
      photo: input.photo || null,
    },
  });

  if (age) await suggestAgeGroup(prisma, age);

  return user;
}
