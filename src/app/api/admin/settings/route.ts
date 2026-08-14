import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { getAppSettings, saveAppSettings } from "@/lib/settingsServer";
import { appSettingsSchema } from "./schema";
import { logger } from "@/lib/logger";

export const GET = withRoute("GET /api/admin/settings", async () => {
  await requireAdminRole();
  return NextResponse.json({ settings: await getAppSettings() });
});

export const PATCH = withRoute("PATCH /api/admin/settings", async (req: NextRequest) => {
  const session = await requireAdminRole();
  const values = parse(appSettingsSchema, await req.json());

  const before = await getAppSettings();
  await saveAppSettings(values);
  logger.info("settings.updated", {
    by: session.username,
    membershipFee: { from: before.membershipFee, to: values.membershipFee },
  });
  await logAction(session.username, "UPDATE_SETTINGS", `${values.membershipFee} أوقية`);

  return NextResponse.json({ settings: await getAppSettings() });
});
