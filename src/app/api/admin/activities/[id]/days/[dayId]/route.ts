import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { removeDay, setDayRest } from "@/lib/tournamentDaysServer";
import { dayUpdateSchema } from "../schema";

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
  async (_req: NextRequest, { params }: { params: Promise<{ id: string; dayId: string }> }) => {
    const { id, dayId } = await params;
    await requireActivityAccess(id);
    await removeDay(id, dayId);
    return NextResponse.json({ ok: true });
  },
);
