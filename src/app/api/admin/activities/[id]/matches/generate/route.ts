import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { generateGroupSchedule } from "@/lib/scheduleGenerateServer";
import { generateSchema } from "./schema";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/matches/generate",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const body = await req.json().catch(() => ({}));
    const { perTeam, times, venue } = parse(generateSchema, body);

    const result = await generateGroupSchedule(id, {
      perTeam: perTeam ?? 3,
      times: times ?? ["16:00", "17:00"],
      venue: venue?.trim() || null,
      username: session.username,
    });

    return NextResponse.json({ ok: true, ...result });
  },
);
