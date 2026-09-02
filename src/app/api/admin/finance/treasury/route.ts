import { NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { getTreasury } from "@/lib/treasuryServer";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/finance/treasury", async () => {
  await requireArea(MONEY_AREAS.treasury);
  return NextResponse.json(await getTreasury());
});
