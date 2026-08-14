import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/rateLimit";
import { withRoute } from "@/lib/route";
import { HttpError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import * as bcrypt from "bcryptjs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const BAD_CREDENTIALS = "رقم الهاتف أو كلمة المرور غير صحيحة";

export const POST = withRoute("Login", async (req: NextRequest) => {
  const { phone, password } = await req.json();

  if (!phone || !password) {
    throw new ValidationError("أدخل رقم الهاتف وكلمة المرور");
  }

  const key = `login:${phone.trim()}`;
  if (isRateLimited(key, MAX_ATTEMPTS)) {
    // No phone number here on purpose, it identifies a member.
    logger.warn("member.login.rate_limited");
    throw new HttpError("RATE_LIMITED", 429, "محاولات كثيرة جداً، حاول بعد قليل");
  }

  const user = await prisma.user.findUnique({ where: { phone: phone.trim() } });
  if (!user) {
    recordFailedAttempt(key, WINDOW_MS);
    throw new UnauthorizedError(BAD_CREDENTIALS);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    recordFailedAttempt(key, WINDOW_MS);
    throw new UnauthorizedError(BAD_CREDENTIALS);
  }

  clearAttempts(key);

  const token = await signToken({ userId: user.id, tokenVersion: user.tokenVersion });
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
