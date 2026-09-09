import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { getAppSettings, saveAppSettings } from "@/lib/settingsServer";
import { adminSettings } from "@/lib/adminSettings";
import { appSettingsSchema } from "./schema";
import { logger } from "@/lib/logger";
import { settings } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/settings", async () => {
  const session = await requireAdmin();
  return NextResponse.json({ settings: adminSettings(await getAppSettings(), session.role) });
});

export const PATCH = withRoute("PATCH /api/admin/settings", async (req: NextRequest) => {
  const session = await requireAdminRole();
  const values = parse(appSettingsSchema, await req.json());

  const before = await getAppSettings();
  await saveAppSettings(values);
  const after = await getAppSettings();

  logger.info("settings.updated", {
    by: session.username,
    membershipFee: { from: before.membershipFee, to: after.membershipFee },
  });
  await logAction(session.username, "UPDATE_SETTINGS", settings.feeAudit(after.membershipFee), {
    ...auditContext(session, req),
    targetType: "Settings",
    before,
    after,
  });

  return NextResponse.json({ settings: after });
});
