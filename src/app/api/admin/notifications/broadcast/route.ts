import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { sendPushIgnoringPreferences, sendPushToUsers } from "@/lib/push";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { broadcastSchema } from "./schema";
import { logger } from "@/lib/logger";
import { counted } from "@/lib/arabicCount";
import { RECIPIENT } from "@/lib/messages";
import { broadcastAudience } from "@/lib/broadcastServer";

export const POST = withRoute(
  "POST /api/admin/notifications/broadcast",
  async (req: NextRequest) => {
    const session = await requireAdminRole("SUPER");
    const { target, activityId, age, title, body, toEveryone } = parse(
      broadcastSchema,
      await req.json(),
    );

    const userIds = await broadcastAudience({ target, activityId, age });
    const payload = { title: title.trim(), body: body.trim() };

    await (
      toEveryone
        ? sendPushIgnoringPreferences(userIds, payload)
        : sendPushToUsers(userIds, payload, "BROADCAST")
    ).catch((err) => logger.error("broadcast.push.error", err));

    await logAction(
      session.username,
      toEveryone ? "SEND_BROADCAST_TO_EVERYONE" : "SEND_BROADCAST",
      `${payload.title} → ${counted(userIds.length, RECIPIENT)}`,
    );

    return NextResponse.json({ ok: true, recipientCount: userIds.length });
  },
);
