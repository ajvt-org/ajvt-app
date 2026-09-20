import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { deletePerson, personOrNotFound } from "@/lib/personDeleteServer";

export const DELETE = withRoute(
  "DELETE /api/admin/users/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const user = await personOrNotFound(id);
    const body = await req.json().catch(() => ({}));
    const typed = String(body?.confirmName ?? body?.confirmPhone ?? "");

    const removed = await deletePerson(user, typed, session.username);

    await logAction(session.username, "DELETE_USER", removed.label, {
      ...auditContext(session, req),
      targetType: "User",
      targetId: id,
      before: {
        fullName: user.fullName,
        phone: user.phone,
        years: removed.years,
        payments: removed.payments,
      },
      meta: removed.forgotten ?? undefined,
    });

    return NextResponse.json({ ok: true });
  },
);
