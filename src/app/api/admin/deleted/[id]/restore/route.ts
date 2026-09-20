import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { restoreDeletedRecord } from "@/lib/restoreRecordServer";

export const POST = withRoute(
  "POST /api/admin/deleted/[id]/restore",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const restored = await restoreDeletedRecord(id);

    await logAction(
      session.username,
      restored.kind === "Member" ? "RESTORE_MEMBER" : "RESTORE_USER",
      restored.label,
      {
        ...auditContext(session, req),
        targetType: restored.kind,
        targetId: restored.recordId,
        after:
          restored.kind === "Member"
            ? { fullName: restored.label }
            : { phone: restored.phone ?? null },
      },
    );

    return NextResponse.json({ ok: true });
  },
);
