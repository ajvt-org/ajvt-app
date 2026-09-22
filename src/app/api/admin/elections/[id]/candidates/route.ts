import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { ELECTIONS_AREA } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { addCandidate } from "@/lib/electionServer";
import { candidateCreateSchema } from "../../schema";

type Params = { params: Promise<{ id: string }> };

export const POST = withRoute(
  "POST /api/admin/elections/[id]/candidates",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireArea(ELECTIONS_AREA);
    const { id } = await params;
    const input = parse(candidateCreateSchema, await req.json());

    const candidate = await addCandidate(id, input);

    await logAction(session.username, "ADD_ELECTION_CANDIDATE", candidate.fullName, {
      ...auditContext(session, req),
      targetType: "ElectionCandidate",
      targetId: candidate.id,
      after: { fullName: candidate.fullName, photo: candidate.photo },
    });

    return NextResponse.json({ candidate }, { status: 201 });
  },
);
