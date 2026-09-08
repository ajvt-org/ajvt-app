import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import {
  configurationLock,
  declareConfiguration,
  listLevels,
  listMoves,
} from "@/lib/matchLevelsServer";
import { levelsSchema } from "./schema";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/admin/activities/[id]/levels",
  async (_req: NextRequest, { params }: Params) => {
    const { id } = await params;
    await requireActivityAccess(id);
    const [levels, moves, lock] = await Promise.all([
      listLevels(id),
      listMoves(id),
      configurationLock(id),
    ]);
    return NextResponse.json({ levels, moves, lock });
  },
);

export const PUT = withRoute(
  "PUT /api/admin/activities/[id]/levels",
  async (req: NextRequest, { params }: Params) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const body = parse(levelsSchema, await req.json());

    const saved = await declareConfiguration(id, body.levels, body.moves);
    await logAction(session.username, "DECLARE_MATCH_LEVELS", String(saved.levels.length));

    return NextResponse.json({ ...saved, lock: await configurationLock(id) });
  },
);
