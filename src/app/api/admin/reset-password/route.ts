import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { generateTempPassword } from "@/lib/member";
import { tempPasswordExpiry } from "@/lib/tempPassword";
import { getAppSettings } from "@/lib/settingsServer";
import * as bcrypt from "bcryptjs";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { resetPasswordSchema } from "./schema";
import { members } from "@/lib/messages";

export const POST = withRoute("POST /api/admin/reset-password", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { userId } = parse(resetPasswordSchema, await req.json());

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: members.notFound }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 12);
  const { tempPasswordHours } = await getAppSettings();
  const expiresAt = tempPasswordExpiry(tempPasswordHours);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashed,
      tempPasswordExpiresAt: expiresAt,
      tokenVersion: { increment: 1 },
    },
  });

  await logAction(session.username, "RESET_MEMBER_PASSWORD", updated.phone ?? updated.id, {
    ...auditContext(session, req),
    targetType: "User",
    targetId: updated.id,
    meta: { phone: updated.phone, expiresAt },
  });

  return NextResponse.json({ tempPassword, expiresAt, hours: tempPasswordHours });
});
