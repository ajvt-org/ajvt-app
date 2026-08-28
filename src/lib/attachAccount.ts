import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validatePhone } from "@/lib/utils";
import { generateTempPassword } from "@/lib/member";
import { tempPasswordExpiry } from "@/lib/tempPassword";
import { getAppSettings } from "@/lib/settingsServer";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { common, members } from "@/lib/messages";

export interface AttachedAccount {
  userId: string;
  tempPassword?: string;
}

export async function attachAccount(
  memberId: string,
  phone: string,
  options: { allowed: boolean },
): Promise<AttachedAccount> {
  if (!options.allowed) throw new ForbiddenError(common.forbidden);

  const phoneError = validatePhone(phone);
  if (phoneError) throw new ValidationError(phoneError);
  const trimmed = phone.trim();

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member) throw new NotFoundError(members.notFound);
  if (member.user.phone) throw new ValidationError("لهذا العضو حساب مسبقاً");

  const found = await prisma.user.findUnique({
    where: { phone: trimmed },
    select: { id: true, members: { select: { id: true }, take: 1 } },
  });
  if (found?.members.length) throw new ConflictError(members.accountAlreadyHasMember);

  if (!found) {
    const tempPassword = generateTempPassword();
    const { tempPasswordHours } = await getAppSettings();
    await prisma.user.update({
      where: { id: member.userId },
      data: {
        phone: trimmed,
        password: await bcrypt.hash(tempPassword, 12),
        tempPasswordExpiresAt: tempPasswordExpiry(tempPasswordHours),
      },
    });
    return { userId: member.userId, tempPassword };
  }

  const placeholder = member.user;
  await prisma.$transaction(async (tx) => {
    await tx.member.update({ where: { id: memberId }, data: { userId: found.id } });
    await tx.user.delete({ where: { id: placeholder.id } });
    await tx.user.update({
      where: { id: found.id },
      data: {
        fullName: placeholder.fullName,
        age: placeholder.age,
        village: placeholder.village,
        photo: placeholder.photo,
        memberNumber: placeholder.memberNumber,
        verifyToken: placeholder.verifyToken,
      },
    });
  });

  return { userId: found.id };
}
