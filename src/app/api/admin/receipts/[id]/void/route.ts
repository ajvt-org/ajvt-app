import { NextRequest, NextResponse } from "next/server";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { receiptView, voidReceipt } from "@/lib/officialReceiptServer";
import { receiptVoidSchema } from "../../schema";

const NOT_FOUND = "الوصل غير موجود أو ملغى من قبل";

export const POST = withRoute(
  "POST /api/admin/receipts/[id]/void",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUnscopedAdmin();
    const { id } = await params;
    const { reason } = parse(receiptVoidSchema, await req.json());

    const row = await voidReceipt(id, reason, session.username);
    if (!row) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

    await logAction(session.username, "VOID_RECEIPT", `${row.number} — ${reason}`, {
      ...auditContext(session, req),
      targetType: "Receipt",
      targetId: row.id,
      after: { number: row.number, status: row.status, voidReason: reason },
    });

    return NextResponse.json({ receipt: receiptView(row) });
  },
);
