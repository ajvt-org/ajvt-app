import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { receiptNamesPayer, receiptViewFor, voidReceipt } from "@/lib/officialReceiptServer";
import { viewerOf } from "@/lib/supportViewer";
import { ForbiddenError } from "@/lib/errors";
import { receiptVoidSchema } from "../../schema";
import { receipts } from "@/lib/messages";

export const POST = withRoute(
  "POST /api/admin/receipts/[number]/void",
  async (req: NextRequest, { params }: { params: Promise<{ number: string }> }) => {
    const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { number } = await params;
    const { reason } = parse(receiptVoidSchema, await req.json());

    const named = await receiptNamesPayer(number, viewerOf(session));
    if (named === null) return NextResponse.json({ error: receipts.notFound }, { status: 404 });
    if (!named) throw new ForbiddenError(receipts.payerWithheld);

    const row = await voidReceipt(number, reason, session.username);
    if (!row) return NextResponse.json({ error: receipts.notFound }, { status: 404 });

    await logAction(session.username, "VOID_RECEIPT", `${row.number} — ${reason}`, {
      ...auditContext(session, req),
      targetType: "Receipt",
      targetId: row.id,
      after: { number: row.number, status: row.status, voidReason: reason },
    });

    return NextResponse.json({ receipt: receiptViewFor(row, named) });
  },
);
