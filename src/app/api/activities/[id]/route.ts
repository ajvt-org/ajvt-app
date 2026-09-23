import { NextRequest, NextResponse } from "next/server";
import { withRoute } from "@/lib/route";
import { NotFoundError } from "@/lib/errors";
import { activities } from "@/lib/messages";
import { publicActivityHeading } from "@/lib/publicActivitiesServer";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/activities/[id]",
  async (_req: NextRequest, { params }: Params) => {
    const { id } = await params;
    const activity = await publicActivityHeading(id);
    if (!activity) throw new NotFoundError(activities.notFound);
    return NextResponse.json({ activity });
  },
);
