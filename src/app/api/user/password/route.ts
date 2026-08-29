import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, signToken } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/rateLimit";
import { withRoute } from "@/lib/route";
import { HttpError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { parse } from "@/lib/validation";
import { logger } from "@/lib/logger";
import * as bcrypt from "bcryptjs";
import { auth, common } from "@/lib/messages";
import { changePasswordSchema } from "./schema";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const POST = withRoute("POST /api/user/password", async (req: NextRequest) => {
  const session = await requireUser({ allowTempPassword: true });
  const { currentPassword, newPassword } = parse(changePasswordSchema, await req.json());

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new UnauthorizedError();

  if (!session.onTempPassword) {
    const key = `password:${session.userId}`;
    if (isRateLimited(key, MAX_ATTEMPTS)) {
      logger.warn("member.password.rate_limited");
      throw new HttpError("RATE_LIMITED", 429, common.tooManyAttempts);
    }
    if (!currentPassword) {
      throw new ValidationError(common.allFieldsRequired);
    }
    if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
      recordFailedAttempt(key, WINDOW_MS);
      throw new UnauthorizedError(auth.currentPasswordWrong);
    }
    clearAttempts(key);
  }

  if (user.password && (await bcrypt.compare(newPassword, user.password))) {
    throw new ValidationError(auth.passwordUnchanged);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(newPassword, 12),
      tempPasswordExpiresAt: null,
      tokenVersion: { increment: 1 },
    },
  });

  const token = await signToken({
    typ: "user",
    userId: updated.id,
    tokenVersion: updated.tokenVersion,
    mustChangePassword: false,
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
