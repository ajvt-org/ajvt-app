import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { validatePhone } from "@/lib/utils";
import * as bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "أدخل رقم الهاتف وكلمة المرور" }, { status: 400 });
    }
    const phoneError = validatePhone(phone);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }
    if (password.length < 3) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 3 أحرف على الأقل" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { phone: phone.trim() } });
    if (existing) {
      return NextResponse.json({ error: "رقم الهاتف مسجّل مسبقاً" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { phone: phone.trim(), password: hashed },
    });

    const token = await signToken({ userId: user.id });
    const res = NextResponse.json({ ok: true }, { status: 201 });
    res.cookies.set("user_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
