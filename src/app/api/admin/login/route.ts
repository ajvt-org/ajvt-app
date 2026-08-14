import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, clearAttempts, getClientIp } from "@/lib/rateLimit";
import * as bcrypt from "bcryptjs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "يرجى ملء جميع الحقول" }, { status: 400 });
    }

    const key = `admin-login:${username}`;
    if (isRateLimited(key, MAX_ATTEMPTS)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، حاول بعد قليل" }, { status: 429 });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      recordFailedAttempt(key, WINDOW_MS);
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      recordFailedAttempt(key, WINDOW_MS);
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    clearAttempts(key);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date(), lastLoginIp: getClientIp(req) },
    });

    const token = await signToken({
      adminId: admin.id,
      username: admin.username,
      tokenVersion: admin.tokenVersion,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
