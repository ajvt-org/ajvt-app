import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { generateTempPassword } from "@/lib/member";
import * as bcrypt from "bcryptjs";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { resetPasswordSchema } from "./schema";

export const POST = withRoute("POST /api/admin/reset-password", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { userId } = parse(resetPasswordSchema, await req.json());

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 12);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, tokenVersion: { increment: 1 } },
  });

  await logAction(session.username, "RESET_MEMBER_PASSWORD", updated.phone, {
    ...auditContext(session, req),
    targetType: "User",
    targetId: updated.id,
    meta: { phone: updated.phone },
  });

  return NextResponse.json({ tempPassword });
});
