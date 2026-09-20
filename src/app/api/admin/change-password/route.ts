import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, setAdminToken, signToken } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { adminChangePasswordSchema } from "./schema";
import { changeAdminPassword } from "@/lib/passwordServer";

export const POST = withRoute("POST /api/admin/change-password", async (req: NextRequest) => {
  const session = await requireAdmin();
  const { currentPassword, newPassword } = parse(adminChangePasswordSchema, await req.json());

  const admin = await changeAdminPassword(session.adminId, currentPassword, newPassword);

  await logAction(session.username, "CHANGE_OWN_PASSWORD");

  const token = await signToken(
    { typ: "admin", adminId: admin.id, username: admin.username, tokenVersion: admin.tokenVersion },
    "8h",
  );
  return setAdminToken(NextResponse.json({ ok: true }), token);
});
