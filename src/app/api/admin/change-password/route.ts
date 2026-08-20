import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, signToken } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import * as bcrypt from "bcryptjs";
import { withRoute } from "@/lib/route";
import { auth, common } from "@/lib/messages";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

export const POST = withRoute("POST /api/admin/change-password", async (req: NextRequest) => {
  const session = await requireAdmin();
  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: common.allFieldsRequired }, { status: 400 });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: auth.passwordTooShort }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  if (!admin) {
    return NextResponse.json({ error: common.unauthorized }, { status: 401 });
  }

  const valid = await bcrypt.compare(currentPassword, admin.password);
  if (!valid) {
    return NextResponse.json({ error: auth.currentPasswordWrong }, { status: 401 });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  const updated = await prisma.admin.update({
    where: { id: admin.id },
    data: { password: hashed, tokenVersion: { increment: 1 } },
  });

  await logAction(session.username, "CHANGE_OWN_PASSWORD");

  // Re-issue a fresh token for this session so the admin isn't logged
  // out on this device — other devices/sessions are invalidated since
  // their token still carries the old tokenVersion.
  const token = await signToken({
    adminId: updated.id,
    username: updated.username,
    tokenVersion: updated.tokenVersion,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
});
