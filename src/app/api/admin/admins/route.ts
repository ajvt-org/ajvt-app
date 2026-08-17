import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import * as bcrypt from "bcryptjs";
import { withRoute } from "@/lib/route";
import { auth, common } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/admins", async () => {
  await requireAdminRole("SUPER");
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      activities: { select: { activity: { select: { id: true, title: true } } } },
      lastLoginAt: true,
      lastLoginIp: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    admins: admins.map(({ activities, ...admin }) => ({
      ...admin,
      activities: activities.map((link) => link.activity),
    })),
  });
});

export const POST = withRoute("POST /api/admin/admins", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");
  const { username, password, role } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: common.allFieldsRequired }, { status: 400 });
  }
  if (username.trim().length > 30) {
    return NextResponse.json(
      { error: "اسم المستخدم طويل جداً (30 حرفاً كحد أقصى)" },
      { status: 400 },
    );
  }
  if (password.length < 3) {
    return NextResponse.json({ error: auth.passwordTooShort }, { status: 400 });
  }
  const roleValue = ["SUPER", "MEMBERS", "ACTIVITIES", "QUIZ", "ACTIVITY"].includes(role)
    ? role
    : "SUPER";

  const existing = await prisma.admin.findUnique({ where: { username: username.trim() } });
  if (existing) {
    return NextResponse.json({ error: "اسم المستخدم مستخدم بالفعل" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.create({
    data: { username: username.trim(), password: hashed, role: roleValue },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  await logAction(session.username, "CREATE_ADMIN", admin.username, {
    ...auditContext(session, req),
    targetType: "Admin",
    targetId: admin.id,
    after: { username: admin.username, role: admin.role },
  });

  return NextResponse.json({ admin }, { status: 201 });
});
