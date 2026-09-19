import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { members, villages as villageMessages } from "@/lib/messages";
import { ageForVillage, isKnownVillage, requiresAgeGroup } from "@/lib/villages";
import { villageNames } from "@/lib/villagesServer";
import { attachAccount } from "@/lib/attachAccount";
import { requireOwnUpload } from "@/lib/uploadOwnerServer";

export interface MemberEdit {
  fullName?: string;
  age?: string | null;
  village?: string;
  photo?: string | null;
  photoLocked?: boolean;
  accountPhone?: string;
}

interface Editor {
  adminId: string;
  role: string;
}

const EXISTING_SELECT = {
  fullName: true,
  age: true,
  village: true,
  photo: true,
  photoLocked: true,
} as const;

interface Existing {
  fullName: string | null;
  age: string | null;
  village: string;
  photo: string | null;
  photoLocked: boolean;
}

interface MemberColumns {
  fullName?: string;
  age?: string | null;
  village?: string;
  photo?: string | null;
  photoLocked?: boolean;
}

async function columnsOf(edit: MemberEdit, existing: Existing, editor: Editor) {
  const data: MemberColumns = {};

  if (edit.fullName !== undefined) data.fullName = edit.fullName;
  if (edit.village !== undefined) data.village = edit.village;

  if (edit.age !== undefined || edit.village !== undefined) {
    const nextVillage = edit.village ?? existing.village;
    const nextAge = ageForVillage(nextVillage, edit.age === undefined ? existing.age : edit.age);
    if (requiresAgeGroup(nextVillage) && !nextAge) throw new ValidationError(members.pickAgeGroup);
    data.age = nextAge;
  }

  if (edit.photo !== undefined) {
    if (edit.photo !== existing.photo) {
      await requireOwnUpload(edit.photo, { userId: null, adminId: editor.adminId });
    }
    data.photo = edit.photo;
  }

  if (edit.photoLocked !== undefined) {
    data.photoLocked = edit.photoLocked;
    if (edit.photoLocked) data.photo = null;
  }

  return data;
}

export async function updateMember(id: string, edit: MemberEdit, editor: Editor) {
  const existing = await prisma.user.findUnique({ where: { id }, select: EXISTING_SELECT });
  if (!existing) throw new NotFoundError(members.notFound);

  if (edit.village !== undefined && !isKnownVillage(edit.village, await villageNames())) {
    throw new ValidationError(villageMessages.unknownVillage);
  }

  const attached =
    edit.accountPhone === undefined
      ? null
      : await attachAccount(id, edit.accountPhone, { allowed: editor.role !== "ACTIVITIES" });

  const data = await columnsOf(edit, existing, editor);

  const person = await prisma.user.update({
    where: { id: attached?.userId ?? id },
    data,
    select: { fullName: true, age: true, village: true },
  });

  return { existing, person, attached };
}
