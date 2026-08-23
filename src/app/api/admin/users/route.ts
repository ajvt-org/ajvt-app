import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { bareAccounts } from "@/lib/bareAccountsServer";

export const GET = withRoute("GET /api/admin/users", async () => {
  await requireAdminRole("MEMBERS");
  return NextResponse.json({ users: await bareAccounts() });
});
