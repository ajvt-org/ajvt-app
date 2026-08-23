import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { insertDay, listDays } from "@/lib/tournamentDaysServer";
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
    const { position, isRest } = parse(dayCreateSchema, await req.json());
    const day = await insertDay(id, position ?? null, isRest ?? false);
    return NextResponse.json({ day }, { status: 201 });
  },
);
