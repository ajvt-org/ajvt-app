import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { sendPushIgnoringPreferences, sendPushToUsers } from "@/lib/push";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { broadcastSchema } from "./schema";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";
import { counted } from "@/lib/arabicCount";
import { latestByAccount } from "@/lib/currentMembership";
import { RECIPIENT } from "@/lib/messages";

export const POST = withRoute(
  "POST /api/admin/notifications/broadcast",
  async (req: NextRequest) => {
    const session = await requireAdminRole("SUPER");
    const { target, activityId, age, title, body, toEveryone } = parse(
      broadcastSchema,
      await req.json(),
    );

    const where: Prisma.MembershipWhereInput = {};
    if (target === "ACTIVITY")
      where.user = { registrations: { some: { activityId: activityId! } } };
    if (target === "AGE") where.user = { age: age!.trim() };

    const rows = await prisma.membership.findMany({
      where,
      select: { userId: true, year: true, status: true },
    });
    const userIds = [...latestByAccount(rows).values()]
      .filter((row) => row.status === "ACTIVE")
      .map((row) => row.userId);

    const payload = { title: title.trim(), body: body.trim() };
    await (
      toEveryone
        ? sendPushIgnoringPreferences(userIds, payload)
        : sendPushToUsers(userIds, payload, "BROADCAST")
    ).catch((err) => logger.error("broadcast.push.error", err));

    await logAction(
      session.username,
      toEveryone ? "SEND_BROADCAST_TO_EVERYONE" : "SEND_BROADCAST",
      `${title.trim()} → ${counted(userIds.length, RECIPIENT)}`,
    );

    return NextResponse.json({ ok: true, recipientCount: userIds.length });
  },
);
