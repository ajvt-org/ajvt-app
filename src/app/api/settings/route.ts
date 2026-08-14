import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settingsServer";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/settings", async () => {
  const settings = await getAppSettings();
  return NextResponse.json({ settings });
});
