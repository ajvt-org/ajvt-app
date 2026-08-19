import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";

export const POST = withRoute("POST /api/admin/logout", async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
});
