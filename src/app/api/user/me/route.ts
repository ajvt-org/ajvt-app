import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendMatchReminders, sendTeamChoiceReminders } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { getAppSettings } from "@/lib/settingsServer";
import { myAccount } from "@/lib/myAccountServer";

export const GET = withRoute("GET /api/user/me", async () => {
  const session = await requireUser();

  sendMatchReminders().catch((err) => logger.error("match.reminders.error", err));
  sendTeamChoiceReminders().catch((err) => logger.error("team.choice.reminders.error", err));

  const { membershipYear } = await getAppSettings();

  return NextResponse.json(await myAccount(session.userId, membershipYear));
});
