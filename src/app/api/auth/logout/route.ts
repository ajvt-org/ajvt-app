import { NextResponse } from "next/server";
import { withRoute } from "@/lib/route";

export const POST = withRoute("POST /api/auth/logout", async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("user_token");
  return res;
});
