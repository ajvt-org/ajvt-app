import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/rateLimit";
import * as bcrypt from "bcryptjs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "أدخل رقم الهاتف وكلمة المرور" }, { status: 400 });
    }

    const key = `login:${phone.trim()}`;
    if (isRateLimited(key, MAX_ATTEMPTS)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، حاول بعد قليل" }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { phone: phone.trim() } });
    if (!user) {
      recordFailedAttempt(key, WINDOW_MS);
      return NextResponse.json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordFailedAttempt(key, WINDOW_MS);
      return NextResponse.json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" }, { status: 401 });
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
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
