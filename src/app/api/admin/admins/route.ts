import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { admins as messages } from "@/lib/messages";
import { SUPER_ROLE, isAdminRole, isOwner } from "@/lib/adminRoles";
import { ForbiddenError } from "@/lib/errors";
import { adminCreateSchema } from "./schema";
import { adminRows, createAdmin } from "@/lib/adminAccountsServer";

export const GET = withRoute("GET /api/admin/admins", async () => {
  const session = await requireAdminRole("SUPER");

  return NextResponse.json({ admins: await adminRows(session.role) });
});

export const POST = withRoute("POST /api/admin/admins", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");
  const { username, password, role } = parse(adminCreateSchema, await req.json());

  const wanted = isAdminRole(role) ? role : SUPER_ROLE;
  if (isOwner(wanted) && !isOwner(session.role)) {
    throw new ForbiddenError(messages.ownerRoleReserved);
  }

  const admin = await createAdmin(username, password, wanted);

  await logAction(session.username, "CREATE_ADMIN", admin.username, {
    ...auditContext(session, req),
    targetType: "Admin",
    targetId: admin.id,
    after: { username: admin.username, role: admin.role },
  });

  return NextResponse.json({ admin }, { status: 201 });
});
