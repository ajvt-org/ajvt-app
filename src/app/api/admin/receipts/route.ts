import { NextRequest, NextResponse } from "next/server";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { issueReceipt, listReceipts, receiptView } from "@/lib/officialReceiptServer";
import { receiptCreateSchema } from "./schema";

export const GET = withRoute("GET /api/admin/receipts", async (req: NextRequest) => {
  await requireUnscopedAdmin();
  const year = Number(new URL(req.url).searchParams.get("year"));
  const receipts = await listReceipts(Number.isInteger(year) && year > 0 ? year : undefined);
  return NextResponse.json({ receipts });
});

export const POST = withRoute("POST /api/admin/receipts", async (req: NextRequest) => {
  const session = await requireUnscopedAdmin();
  const { payerName, reason, amount, issuedOn, memberId } = parse(
    receiptCreateSchema,
    await req.json(),
  );

  const row = await issueReceipt({
    payerName,
    reason,
    amount,
    issuedOn: issuedOn ? new Date(issuedOn as string) : new Date(),
    issuedBy: session.username,
    memberId: memberId || null,
  });

  await logAction(session.username, "ISSUE_RECEIPT", `${row.number} — ${payerName}`, {
    ...auditContext(session, req),
    targetType: "Receipt",
    targetId: row.id,
    after: { number: row.number, payerName, reason, amount },
  });

  return NextResponse.json({ receipt: receiptView(row) }, { status: 201 });
});
