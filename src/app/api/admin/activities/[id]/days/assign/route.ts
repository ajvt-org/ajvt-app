import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { assignMatch } from "@/lib/tournamentDaysServer";
import { dayAssignSchema } from "../schema";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/days/assign",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);
    const { matchId, dayId, time } = parse(dayAssignSchema, await req.json());
    const match = await assignMatch(id, matchId, dayId, time ?? "16:00");
    return NextResponse.json({ match });
  },
);
