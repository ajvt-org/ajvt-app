import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/admin/me", async () => {
  const session = await requireAdmin();
  return NextResponse.json({ username: session.username, role: session.role });
});
