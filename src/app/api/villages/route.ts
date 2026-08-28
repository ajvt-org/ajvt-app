import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { villageNames } from "@/lib/villagesServer";

export const GET = withRoute("GET /api/villages", async () => {
  return NextResponse.json({ villages: await villageNames() });
});
