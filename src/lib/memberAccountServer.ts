import { prisma } from "@/lib/prisma";
import { validatePhone } from "@/lib/utils";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { members } from "@/lib/messages";
import { PERSON_NAME_SELECT } from "@/lib/person";

export interface PhoneChange {
  person: { fullName: string | null };
  before: string;
  phone: string;
  changed: boolean;
}

export async function changeAccountPhone(id: string, phone: string): Promise<PhoneChange> {
  const phoneError = validatePhone(phone);
  if (phoneError) throw new ValidationError(phoneError);
  const next = phone.trim();

  const account = await prisma.user.findUnique({
    where: { id },
    select: { phone: true, ...PERSON_NAME_SELECT },
  });
  if (!account) throw new NotFoundError(members.notFound);
  if (!account.phone) throw new ConflictError(members.noAccountToCorrect);

  const { phone: before, ...person } = account;
  if (before === next) return { person, before, phone: next, changed: false };

  const taken = await prisma.user.findUnique({ where: { phone: next }, select: { id: true } });
  if (taken) throw new ConflictError(members.accountPhoneTaken);

  await prisma.user.update({ where: { id }, data: { phone: next } });

  return { person, before, phone: next, changed: true };
}
