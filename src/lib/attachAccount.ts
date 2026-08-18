import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validatePhone } from "@/lib/utils";
import { generateTempPassword } from "@/lib/member";
import { tempPasswordExpiry } from "@/lib/tempPassword";
import { getAppSettings } from "@/lib/settingsServer";
import { ConflictError, ForbiddenError, ValidationError } from "@/lib/errors";
import { common, members } from "@/lib/messages";

export interface AttachedAccount {
  userId: string;
  tempPassword?: string;
}

export async function attachAccount(
  phone: string,
  options: { allowed: boolean; alreadyAttached: boolean },
): Promise<AttachedAccount> {
  if (!options.allowed) throw new ForbiddenError(common.forbidden);
  if (options.alreadyAttached) throw new ValidationError("لهذا العضو حساب مسبقاً");

  const phoneError = validatePhone(phone);
  if (phoneError) throw new ValidationError(phoneError);

  const trimmed = phone.trim();
  const found = await prisma.user.findUnique({
    where: { phone: trimmed },
    select: { id: true, members: { select: { id: true }, take: 1 } },
  });
  if (found?.members.length) throw new ConflictError(members.accountAlreadyHasMember);
  if (found) return { userId: found.id };

  const tempPassword = generateTempPassword();
  const { tempPasswordHours } = await getAppSettings();
  const created = await prisma.user.create({
    data: {
      phone: trimmed,
      password: await bcrypt.hash(tempPassword, 12),
      tempPasswordExpiresAt: tempPasswordExpiry(tempPasswordHours),
    },
  });
  return { userId: created.id, tempPassword };
}
