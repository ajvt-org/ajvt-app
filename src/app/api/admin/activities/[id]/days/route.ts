import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { insertDay, listDays } from "@/lib/tournamentDaysServer";
import { notifyActivityFollowers } from "@/lib/tournamentNotify";
import { prisma } from "@/lib/prisma";
import { notify as notifyMessages } from "@/lib/messages";
import { dayCreateSchema } from "./schema";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/days",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);
    return NextResponse.json(await listDays(id));
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/days",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);
    const { position, isRest, notify } = parse(dayCreateSchema, await req.json());
    const { day, shifted } = await insertDay(id, position ?? null, isRest ?? false);
    if (notify !== false && shifted > 0) {
      const activity = await prisma.activity.findUnique({
        where: { id },
        select: { title: true },
      });
      if (activity)
        await notifyActivityFollowers(id, notifyMessages.scheduleShifted(activity.title, id));
    }
    return NextResponse.json({ day, shifted }, { status: 201 });
  },
);
