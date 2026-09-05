import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { getAccountLedger } from "@/lib/accountLedgerServer";
import { withRoute } from "@/lib/route";

function day(raw: string | null, endOfDay: boolean): Date | undefined {
  if (!raw) return undefined;
  const at = new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(at.getTime()) ? undefined : at;
}

export const GET = withRoute(
  "GET /api/admin/finance/treasury/accounts",
  async (req: NextRequest) => {
    await requireArea(MONEY_AREAS.treasury);
    const params = req.nextUrl.searchParams;
    const methods = await getAccountLedger({
      from: day(params.get("from"), false),
      to: day(params.get("to"), true),
    });
    return NextResponse.json({ methods });
  },
);
