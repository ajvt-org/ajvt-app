import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, clearAttempts, getClientIp } from "@/lib/rateLimit";
import * as bcrypt from "bcryptjs";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { logAction } from "@/lib/audit";
import { common } from "@/lib/messages";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 30;

export const POST = withRoute("POST /api/admin/login", async (req: NextRequest) => {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: common.allFieldsRequired }, { status: 400 });
  }

  const key = `admin-login:${username}`;
  const ipKey = `admin-login-ip:${getClientIp(req)}`;
  if (isRateLimited(key, MAX_ATTEMPTS) || isRateLimited(ipKey, MAX_IP_ATTEMPTS)) {
    logger.warn("admin.login.rate_limited", { username, ip: getClientIp(req) });
    return NextResponse.json({ error: common.tooManyAttempts }, { status: 429 });
  }

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    recordFailedAttempt(key, WINDOW_MS);
    recordFailedAttempt(ipKey, WINDOW_MS);
    logger.warn("admin.login.failed", { username, ip: getClientIp(req), reason: "unknown_user" });
    return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    recordFailedAttempt(key, WINDOW_MS);
    recordFailedAttempt(ipKey, WINDOW_MS);
    logger.warn("admin.login.failed", { username, ip: getClientIp(req), reason: "bad_password" });
    return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
  }

  clearAttempts(key);
  logger.info("admin.login.ok", { username, role: admin.role, ip: getClientIp(req) });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date(), lastLoginIp: getClientIp(req) },
  });
  await logAction(admin.username, "ADMIN_LOGIN", undefined, {
    adminId: admin.id,
    adminRole: admin.role,
    targetType: "Admin",
    targetId: admin.id,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  const token = await signToken(
    {
      typ: "admin",
      adminId: admin.id,
      username: admin.username,
      tokenVersion: admin.tokenVersion,
    },
    "8h",
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
});
