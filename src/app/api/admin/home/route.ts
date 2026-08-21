import { NextResponse } from "next/server";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { adminHomeSummary } from "@/lib/adminHomeServer";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/home", async () => {
  await requireUnscopedAdmin();
  return NextResponse.json(await adminHomeSummary());
});
