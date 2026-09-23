import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import type { AuditAction } from "@/lib/auditLabels";
import { withRoute } from "@/lib/route";
import { canHandleKind } from "@/lib/deletedRecords";
import { restoreDeletedRecord, type Restored } from "@/lib/restoreRecordServer";

const RESTORE_ACTIONS: Record<Restored["kind"], AuditAction> = {
  Member: "RESTORE_MEMBER",
  User: "RESTORE_USER",
  Election: "RESTORE_ELECTION",
};

function restoredAfter(restored: Restored) {
  if (restored.kind === "Member") return { fullName: restored.label };
  if (restored.kind === "Election") return { title: restored.label };
  return { phone: restored.phone ?? null };
}

export const POST = withRoute(
  "POST /api/admin/deleted/[id]/restore",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const restored = await restoreDeletedRecord(id, (kind) => canHandleKind(session.role, kind));

    await logAction(session.username, RESTORE_ACTIONS[restored.kind], restored.label, {
      ...auditContext(session, req),
      targetType: restored.kind,
      targetId: restored.recordId,
      after: restoredAfter(restored),
    });

    return NextResponse.json({ ok: true });
  },
);
