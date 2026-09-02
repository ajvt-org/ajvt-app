import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { receiptsForAccount } from "@/lib/receiptsServer";

export const GET = withRoute("GET /api/user/receipts", async () => {
  const session = await requireUser();
  const receipts = await receiptsForAccount(session.userId, { userId: session.userId });
  return NextResponse.json({ receipts });
});
