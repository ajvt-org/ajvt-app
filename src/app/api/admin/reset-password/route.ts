import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { generateTempPassword } from "@/lib/member";
import * as bcrypt from "bcryptjs";
import { withRoute } from "@/lib/route";

export const POST = withRoute("POST /api/admin/reset-password", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 12);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, tokenVersion: { increment: 1 } },
  });

  await logAction(session.username, "RESET_MEMBER_PASSWORD", updated.phone);

  return NextResponse.json({ tempPassword });
});
