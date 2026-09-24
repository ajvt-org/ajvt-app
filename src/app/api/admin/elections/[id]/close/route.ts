import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { moveElectionClose } from "@/lib/electionServer";
import { electionCloseSchema } from "../../schema";

type Params = { params: Promise<{ id: string }> };

export const PUT = withRoute(
  "PUT /api/admin/elections/[id]/close",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireOwner();
    const { id } = await params;
    const { closesAt } = parse(electionCloseSchema, await req.json());

    const { election, before, after } = await moveElectionClose(id, closesAt);

    await logAction(session.username, "EXTEND_ELECTION", election.title, {
      ...auditContext(session, req),
      targetType: "Election",
      targetId: election.id,
      before: { endsAt: before.toISOString() },
      after: { endsAt: after.toISOString() },
    });

    return NextResponse.json({ election });
  },
);
