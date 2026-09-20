import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { approvedAgeNames } from "@/lib/ageGroupsServer";

export const GET = withRoute("GET /api/ages", async () => {
  return NextResponse.json({ ages: await approvedAgeNames() });
});
