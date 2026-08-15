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

// The current password is asked for even though the session already proves who
// this is: a phone left unlocked is the likeliest way in, and without it that
// phone can lock the owner out of their own account.
//
// Changing it raises tokenVersion, which requireUser checks, so every other
// session dies. This one is handed a fresh cookie, since signing out the person
// who just changed their password is not what they asked for.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const POST = withRoute("POST /api/user/password", async (req: NextRequest) => {
  const session = await requireUser();
  const { currentPassword, newPassword } = parse(changePasswordSchema, await req.json());

  const key = `password:${session.userId}`;
  if (isRateLimited(key, MAX_ATTEMPTS)) {
    logger.warn("member.password.rate_limited");
    throw new HttpError("RATE_LIMITED", 429, common.tooManyAttempts);
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new UnauthorizedError();

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    recordFailedAttempt(key, WINDOW_MS);
    throw new UnauthorizedError(auth.currentPasswordWrong);
  }

  if (currentPassword === newPassword) {
    throw new ValidationError(auth.passwordUnchanged);
  }

  clearAttempts(key);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 12), tokenVersion: { increment: 1 } },
  });

  const token = await signToken({ userId: updated.id, tokenVersion: updated.tokenVersion });
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
