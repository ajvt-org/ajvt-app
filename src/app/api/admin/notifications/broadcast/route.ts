import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { broadcastSchema } from "./schema";
import { logger } from "@/lib/logger";

export const POST = withRoute(
  "POST /api/admin/notifications/broadcast",
  async (req: NextRequest) => {
    const session = await requireAdminRole("SUPER");
    const { target, activityId, age, title, body } = parse(broadcastSchema, await req.json());

    const where: {
      status: string;
      registrations?: { some: { activityId: string } };
      age?: string;
    } = { status: "ACTIVE" };
    if (target === "ACTIVITY") where.registrations = { some: { activityId: activityId! } };
    if (target === "AGE") where.age = age!.trim();

    const members = await prisma.member.findMany({ where, select: { userId: true } });
    const userIds = Array.from(
      new Set(members.map((m) => m.userId).filter((id): id is string => id !== null)),
    );

    await Promise.all(
      userIds.map((uid) =>
        sendPushToUser(uid, { title: title.trim(), body: body.trim() }).catch((err) =>
          logger.error("broadcast.push.error", err),
        ),
      ),
    );

    await logAction(
      session.username,
      "SEND_BROADCAST",
      `${title.trim()} → ${userIds.length} مستلم`,
    );

    return NextResponse.json({ ok: true, recipientCount: userIds.length });
  },
);
