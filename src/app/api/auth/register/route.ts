import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, getClientIp } from "@/lib/rateLimit";
import * as bcrypt from "bcryptjs";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ConflictError, ValidationError } from "@/lib/errors";
import { auth, common, villages } from "@/lib/messages";
import { ageForVillage, isKnownVillage } from "@/lib/villages";
import { villageNames } from "@/lib/villagesServer";
import { suggestAgeGroup } from "@/lib/ageGroups";
import { registerSchema } from "./schema";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export const POST = withRoute("POST /api/auth/register", async (req: NextRequest) => {
  const key = `register:${getClientIp(req)}`;
  if (isRateLimited(key, MAX_ATTEMPTS)) {
    return NextResponse.json({ error: common.tooManyAttempts }, { status: 429 });
  }
  recordFailedAttempt(key, WINDOW_MS);

  const { phone, password, fullName, village, age, photo } = parse(
    registerSchema,
    await req.json(),
  );

  if (!isKnownVillage(village, await villageNames())) {
    throw new ValidationError(villages.unknownVillage);
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new ConflictError(auth.phoneTaken);

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      phone,
      password: hashed,
      fullName,
      village,
      age: ageForVillage(village, age),
      photo: photo || null,
    },
  });

  const suggested = ageForVillage(village, age);
  if (suggested) await suggestAgeGroup(prisma, suggested);

  const token = await signToken({ typ: "user", userId: user.id, tokenVersion: user.tokenVersion });
  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set("user_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
});
