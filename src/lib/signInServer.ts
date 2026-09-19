import * as bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { HttpError, UnauthorizedError } from "./errors";
import { auth, common } from "./messages";
import { logger } from "./logger";
import { clearAttempts, isRateLimited, recordFailedAttempt } from "./rateLimit";
import { isTempPasswordActive, isTempPasswordExpired } from "./tempPassword";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 30;

const DUMMY_HASH = bcrypt.hashSync("timing-equalizer", 12);

function tooManyAttempts(): HttpError {
  return new HttpError("RATE_LIMITED", 429, common.tooManyAttempts);
}

function refuse(key: string, ipKey: string): void {
  recordFailedAttempt(key, WINDOW_MS);
  recordFailedAttempt(ipKey, WINDOW_MS);
}

export async function signInAdmin(username: string, password: string, ip: string) {
  const key = `admin-login:${username}`;
  const ipKey = `admin-login-ip:${ip}`;
  if (isRateLimited(key, MAX_ATTEMPTS) || isRateLimited(ipKey, MAX_IP_ATTEMPTS)) {
    logger.warn("admin.login.rate_limited");
    throw tooManyAttempts();
  }

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    await bcrypt.compare(password, DUMMY_HASH);
    refuse(key, ipKey);
    logger.warn("admin.login.failed", { reason: "unknown_user" });
    throw new UnauthorizedError(auth.adminCredentialsWrong);
  }

  if (!(await bcrypt.compare(password, admin.password))) {
    refuse(key, ipKey);
    logger.warn("admin.login.failed", { reason: "bad_password" });
    throw new UnauthorizedError(auth.adminCredentialsWrong);
  }

  clearAttempts(key);
  logger.info("admin.login.ok", { role: admin.role });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ip },
  });

  return admin;
}

export async function signInMember(phone: string, password: string, ip: string) {
  const trimmed = phone.trim();
  const key = `login:${trimmed}`;
  const ipKey = `login-ip:${ip}`;
  if (isRateLimited(key, MAX_ATTEMPTS) || isRateLimited(ipKey, MAX_IP_ATTEMPTS)) {
    logger.warn("member.login.rate_limited");
    throw tooManyAttempts();
  }

  const user = await prisma.user.findUnique({ where: { phone: trimmed } });
  if (!user?.password) {
    await bcrypt.compare(password, DUMMY_HASH);
    refuse(key, ipKey);
    throw new UnauthorizedError(auth.memberCredentialsWrong);
  }

  if (!(await bcrypt.compare(password, user.password))) {
    refuse(key, ipKey);
    throw new UnauthorizedError(auth.memberCredentialsWrong);
  }

  if (isTempPasswordExpired(user.tempPasswordExpiresAt)) {
    throw new UnauthorizedError(auth.tempPasswordExpired);
  }

  clearAttempts(key);

  return { user, mustChangePassword: isTempPasswordActive(user.tempPasswordExpiresAt) };
}
