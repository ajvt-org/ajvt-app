import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, clearAttempts, getClientIp } from "@/lib/rateLimit";
import { withRoute } from "@/lib/route";
import { HttpError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import * as bcrypt from "bcryptjs";
import { auth, common } from "@/lib/messages";
import { isTempPasswordActive, isTempPasswordExpired } from "@/lib/tempPassword";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 30;

const BAD_CREDENTIALS = "رقم الهاتف أو كلمة المرور غير صحيحة";

const DUMMY_HASH = bcrypt.hashSync("timing-equalizer", 12);

export const POST = withRoute("Login", async (req: NextRequest) => {
  const { phone, password } = await req.json();

  if (!phone || !password) {
    throw new ValidationError(auth.credentialsRequired);
  }

  const key = `login:${phone.trim()}`;
  const ipKey = `login-ip:${getClientIp(req)}`;
  if (isRateLimited(key, MAX_ATTEMPTS) || isRateLimited(ipKey, MAX_IP_ATTEMPTS)) {
    // No phone number here on purpose, it identifies a member.
    logger.warn("member.login.rate_limited");
    throw new HttpError("RATE_LIMITED", 429, common.tooManyAttempts);
  }

  const user = await prisma.user.findUnique({ where: { phone: phone.trim() } });
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    recordFailedAttempt(key, WINDOW_MS);
    recordFailedAttempt(ipKey, WINDOW_MS);
    throw new UnauthorizedError(BAD_CREDENTIALS);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    recordFailedAttempt(key, WINDOW_MS);
    recordFailedAttempt(ipKey, WINDOW_MS);
    throw new UnauthorizedError(BAD_CREDENTIALS);
  }

  // Checked after the password, so a wrong guess still answers with the
  // generic failure rather than confirming the account exists.
  if (isTempPasswordExpired(user.tempPasswordExpiresAt)) {
    throw new UnauthorizedError(auth.tempPasswordExpired);
  }

  clearAttempts(key);

  const mustChangePassword = isTempPasswordActive(user.tempPasswordExpiresAt);
  const token = await signToken({
    typ: "user",
    userId: user.id,
    tokenVersion: user.tokenVersion,
    mustChangePassword,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("user_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
});
