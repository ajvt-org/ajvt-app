import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/verify/[memberNumber]", async () => {
  return NextResponse.json({ valid: false, message: "هذا المسار غير متاح" }, { status: 410 });
});
