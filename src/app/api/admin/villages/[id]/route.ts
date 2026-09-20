import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { removeVillage, renameVillage } from "@/lib/villageAdminServer";

export const PATCH = withRoute(
  "PATCH /api/admin/villages/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { name } = await req.json();

    const { village, existing, moved } = await renameVillage(id, name);

    await logAction(session.username, "UPDATE_VILLAGE", `${existing.name} → ${village.name}`, {
      ...auditContext(session, req),
      targetType: "Village",
      targetId: village.id,
      before: { name: existing.name },
      after: { name: village.name },
      meta: { membersRenamed: moved },
    });

    return NextResponse.json({ village });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/villages/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const existing = await removeVillage(id);
    await logAction(session.username, "DELETE_VILLAGE", existing.name);

    return NextResponse.json({ ok: true });
  },
);
