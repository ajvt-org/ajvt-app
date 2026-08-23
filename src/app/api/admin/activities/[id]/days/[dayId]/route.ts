import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { removeDay, setDayRest } from "@/lib/tournamentDaysServer";
import { notifyActivityFollowers } from "@/lib/tournamentNotify";
import { prisma } from "@/lib/prisma";
import { notify as notifyMessages } from "@/lib/messages";
import { dayDeleteSchema, dayUpdateSchema } from "../schema";

export const PATCH = withRoute(
  "PATCH /api/admin/activities/[id]/days/[dayId]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string; dayId: string }> }) => {
    const { id, dayId } = await params;
    await requireActivityAccess(id);
    const { isRest } = parse(dayUpdateSchema, await req.json());
    const day = await setDayRest(id, dayId, isRest);
    return NextResponse.json({ day });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/activities/[id]/days/[dayId]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string; dayId: string }> }) => {
    const { id, dayId } = await params;
    await requireActivityAccess(id);
    const { notify } = parse(dayDeleteSchema, await req.json().catch(() => ({})));
    const { shifted } = await removeDay(id, dayId);
    if (notify !== false && shifted > 0) {
      const activity = await prisma.activity.findUnique({
        where: { id },
        select: { title: true },
      });
      if (activity)
        await notifyActivityFollowers(id, notifyMessages.scheduleShifted(activity.title, id));
    }
    return NextResponse.json({ ok: true, shifted });
  },
);
