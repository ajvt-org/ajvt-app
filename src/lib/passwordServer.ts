import * as bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { HttpError, NotFoundError, UnauthorizedError, ValidationError } from "./errors";
import { auth, common, members } from "./messages";
import { logger } from "./logger";
import { clearAttempts, isRateLimited, recordFailedAttempt } from "./rateLimit";
import { getAppSettings } from "./settingsServer";
import { generateTempPassword, tempPasswordExpiry } from "./tempPassword";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ROUNDS = 12;

export async function changeAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new UnauthorizedError(common.unauthorized);

  if (!(await bcrypt.compare(currentPassword, admin.password))) {
    throw new UnauthorizedError(auth.currentPasswordWrong);
  }

  return prisma.admin.update({
    where: { id: admin.id },
    data: { password: await bcrypt.hash(newPassword, ROUNDS), tokenVersion: { increment: 1 } },
  });
}

export interface PasswordChanger {
  userId: string;
  onTempPassword: boolean;
}

export async function changeMemberPassword(
  session: PasswordChanger,
  currentPassword: string | undefined,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new UnauthorizedError();

  if (!session.onTempPassword) {
    const key = `password:${session.userId}`;
    if (isRateLimited(key, MAX_ATTEMPTS)) {
      logger.warn("member.password.rate_limited");
      throw new HttpError("RATE_LIMITED", 429, common.tooManyAttempts);
    }
    if (!currentPassword) throw new ValidationError(common.allFieldsRequired);
    if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
      recordFailedAttempt(key, WINDOW_MS);
      throw new UnauthorizedError(auth.currentPasswordWrong);
    }
    clearAttempts(key);
  }

  if (user.password && (await bcrypt.compare(newPassword, user.password))) {
    throw new ValidationError(auth.passwordUnchanged);
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(newPassword, ROUNDS),
      tempPasswordExpiresAt: null,
      tokenVersion: { increment: 1 },
    },
  });
}

export async function resetMemberPassword(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new NotFoundError(members.notFound);

  const tempPassword = generateTempPassword();
  const { tempPasswordHours } = await getAppSettings();
  const expiresAt = tempPasswordExpiry(tempPasswordHours);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      password: await bcrypt.hash(tempPassword, ROUNDS),
      tempPasswordExpiresAt: expiresAt,
      tokenVersion: { increment: 1 },
    },
  });

  return { tempPassword, expiresAt, hours: tempPasswordHours, account: updated };
}
