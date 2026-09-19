import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { memberOptions } from "@/lib/membersServer";

export const GET = withRoute("GET /api/admin/members/options", async () => {
  await requireAdminRole("MEMBERS");

  return NextResponse.json({ members: await memberOptions() });
});
