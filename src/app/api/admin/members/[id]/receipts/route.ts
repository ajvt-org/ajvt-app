import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { receiptsForAccount } from "@/lib/receiptsServer";

export const GET = withRoute(
  "GET /api/admin/members/[id]/receipts",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("MEMBERS");
    const { id } = await params;
    const userId = id;
    return NextResponse.json({ receipts: await receiptsForAccount(userId) });
  },
);
