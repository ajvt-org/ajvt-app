import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";

// Retired with the schema that had a memberNumber field. Kept so an old card
// that is still in someone's pocket gets an answer rather than a 404.
export const GET = withRoute("GET /api/verify/[memberNumber]", async () => {
  return NextResponse.json({ valid: false, message: "هذا المسار غير متاح" }, { status: 410 });
});
