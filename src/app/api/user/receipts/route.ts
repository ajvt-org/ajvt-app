import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { receiptsForAccount } from "@/lib/receiptsServer";

export const GET = withRoute("GET /api/user/receipts", async () => {
  const session = await requireUser();
  return NextResponse.json({ receipts: await receiptsForAccount(session.userId) });
});
