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
  userId: string,
  phone: string,
  options: { allowed: boolean },
): Promise<AttachedAccount> {
  if (!options.allowed) throw new ForbiddenError(common.forbidden);

  const phoneError = validatePhone(phone);
  if (phoneError) throw new ValidationError(phoneError);
  const trimmed = phone.trim();

  const placeholder = await prisma.user.findUnique({ where: { id: userId } });
  if (!placeholder) throw new NotFoundError(members.notFound);
  if (placeholder.phone) throw new ValidationError(members.alreadyHasAccount);

  const found = await prisma.user.findUnique({
    where: { phone: trimmed },
    select: { id: true, memberships: { select: { id: true }, take: 1 } },
  });
  if (found?.memberships.length) throw new ConflictError(members.accountAlreadyHasMember);

  if (!found) {
    const tempPassword = generateTempPassword();
    const { tempPasswordHours } = await getAppSettings();
    await prisma.user.update({
      where: { id: userId },
      data: {
        phone: trimmed,
        password: await bcrypt.hash(tempPassword, 12),
        tempPasswordExpiresAt: tempPasswordExpiry(tempPasswordHours),
      },
    });
    return { userId, tempPassword };
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.updateMany({ where: { userId }, data: { userId: found.id } });
    await tx.user.delete({ where: { id: userId } });
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
