import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { waitingRequests } from "@/lib/waitingRequestsServer";

export const GET = withRoute("GET /api/admin/waiting", async () => {
  await requireAdminRole("MEMBERS");
  return NextResponse.json(await waitingRequests());
});
