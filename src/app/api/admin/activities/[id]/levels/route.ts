import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { declareLevels, listLevels, playedLevelIds } from "@/lib/matchLevelsServer";
import { levelsSchema } from "./schema";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/admin/activities/[id]/levels",
  async (_req: NextRequest, { params }: Params) => {
    const { id } = await params;
    await requireActivityAccess(id);
    const [levels, played] = await Promise.all([listLevels(id), playedLevelIds(id)]);
    return NextResponse.json({ levels, played });
  },
);

export const PUT = withRoute(
  "PUT /api/admin/activities/[id]/levels",
  async (req: NextRequest, { params }: Params) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const body = parse(levelsSchema, await req.json());

    const levels = await declareLevels(id, body.levels);
    await logAction(session.username, "DECLARE_MATCH_LEVELS", String(levels.length));

    return NextResponse.json({ levels, played: await playedLevelIds(id) });
  },
);
