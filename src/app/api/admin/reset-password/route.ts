import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { resetPasswordSchema } from "./schema";
import { resetMemberPassword } from "@/lib/passwordServer";

export const POST = withRoute("POST /api/admin/reset-password", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS");
  const { userId } = parse(resetPasswordSchema, await req.json());

  const { tempPassword, expiresAt, hours, account } = await resetMemberPassword(userId);

  await logAction(session.username, "RESET_MEMBER_PASSWORD", account.phone ?? account.id, {
    ...auditContext(session, req),
    targetType: "User",
    targetId: account.id,
    meta: { phone: account.phone, expiresAt },
  });

  return NextResponse.json({ tempPassword, expiresAt, hours });
});
