import { NextResponse } from "next/server";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { getTreasury } from "@/lib/treasuryServer";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/finance/treasury", async () => {
  await requireUnscopedAdmin();
  return NextResponse.json(await getTreasury());
});
