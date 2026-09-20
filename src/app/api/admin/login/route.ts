import { NextRequest, NextResponse } from "next/server";
import { setAdminToken, signToken } from "@/lib/auth";
import { getClientIp } from "@/lib/rateLimit";
import { withRoute } from "@/lib/route";
import { logAction } from "@/lib/audit";
import { ValidationError } from "@/lib/errors";
import { common } from "@/lib/messages";
import { signInAdmin } from "@/lib/signInServer";

export const POST = withRoute("POST /api/admin/login", async (req: NextRequest) => {
  const { username, password } = await req.json();
  if (!username || !password) throw new ValidationError(common.allFieldsRequired);

  const ip = getClientIp(req);
  const admin = await signInAdmin(username, password, ip);

  await logAction(admin.username, "ADMIN_LOGIN", undefined, {
    adminId: admin.id,
    adminRole: admin.role,
    targetType: "Admin",
    targetId: admin.id,
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  const token = await signToken(
    { typ: "admin", adminId: admin.id, username: admin.username, tokenVersion: admin.tokenVersion },
    "8h",
  );
  return setAdminToken(NextResponse.json({ ok: true }), token);
});
