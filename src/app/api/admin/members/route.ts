import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { sendMatchReminders, sendTeamChoiceReminders } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { memberRows } from "@/lib/membersServer";
import { viewerOf } from "@/lib/supportViewer";

export const GET = withRoute("GET /api/admin/members", async () => {
  const session = await requireAdminRole("MEMBERS");
  sendMatchReminders().catch((err) => logger.error("match.reminders.error", err));
  sendTeamChoiceReminders().catch((err) => logger.error("team.choice.reminders.error", err));

  return NextResponse.json(await memberRows(viewerOf(session)));
});
