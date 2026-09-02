import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { issueReceipt, listReceipts, receiptView, receiptYears } from "@/lib/officialReceiptServer";
import { receiptCreateSchema } from "./schema";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute("GET /api/admin/receipts", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
  const asked = Number(new URL(req.url).searchParams.get("year"));
  const years = await receiptYears();
  const year = Number.isInteger(asked) && asked > 0 ? asked : (years[0] ?? null);
  const receipts = await listReceipts(viewerOf(session), year ?? undefined);
  return NextResponse.json({ receipts, years, year });
});

export const POST = withRoute("POST /api/admin/receipts", async (req: NextRequest) => {
  const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
  const { payerName, reason, amount, issuedOn } = parse(receiptCreateSchema, await req.json());

  const row = await issueReceipt({
    payerName,
    reason,
    amount,
    issuedOn: issuedOn ? new Date(issuedOn as string) : new Date(),
    issuedBy: session.username,
  });

  await logAction(session.username, "ISSUE_RECEIPT", `${row.number} — ${payerName}`, {
    ...auditContext(session, req),
    targetType: "Receipt",
    targetId: row.id,
    after: { number: row.number, payerName, reason, amount },
  });

  return NextResponse.json({ receipt: receiptView(row) }, { status: 201 });
});
