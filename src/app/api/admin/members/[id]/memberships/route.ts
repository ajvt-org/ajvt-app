import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { NotFoundError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { viewerOf } from "@/lib/supportViewer";
import { memberMembershipHistory } from "@/lib/memberHistoryServer";

export const GET = withRoute(
  "GET /api/admin/members/[id]/memberships",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const history = await memberMembershipHistory(id, viewerOf(session));
    if (!history) throw new NotFoundError(messages.notFound);

    return NextResponse.json(history);
  },
);
