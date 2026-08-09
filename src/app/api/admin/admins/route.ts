import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import * as bcrypt from "bcryptjs";

export async function GET() {
  try {
    await requireAdminRole("SUPER");
    const admins = await prisma.admin.findMany({
      select: { id: true, username: true, role: true, lastLoginAt: true, lastLoginIp: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ admins });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole("SUPER");
    const { username, password, role } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "يرجى ملء جميع الحقول" }, { status: 400 });
    }
    if (username.trim().length > 30) {
      return NextResponse.json({ error: "اسم المستخدم طويل جداً (30 حرفاً كحد أقصى)" }, { status: 400 });
    }
    if (password.length < 3) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 3 أحرف على الأقل" }, { status: 400 });
    }
    const roleValue = ["SUPER", "MEMBERS", "ACTIVITIES"].includes(role) ? role : "SUPER";

    const existing = await prisma.admin.findUnique({ where: { username: username.trim() } });
    if (existing) {
      return NextResponse.json({ error: "اسم المستخدم مستخدم بالفعل" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({
      data: { username: username.trim(), password: hashed, role: roleValue },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    await logAction(session.username, "CREATE_ADMIN", admin.username);

    return NextResponse.json({ admin }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Create admin error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
