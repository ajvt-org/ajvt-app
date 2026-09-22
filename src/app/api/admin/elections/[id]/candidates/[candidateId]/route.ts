import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { ELECTIONS_AREA } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { deleteCandidate, updateCandidate } from "@/lib/electionServer";
import { candidateUpdateSchema } from "../../../schema";

type Params = { params: Promise<{ id: string; candidateId: string }> };

export const PATCH = withRoute(
  "PATCH /api/admin/elections/[id]/candidates/[candidateId]",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireArea(ELECTIONS_AREA);
    const { id, candidateId } = await params;
    const input = parse(candidateUpdateSchema, await req.json());

    const candidate = await updateCandidate(id, candidateId, input);

    await logAction(session.username, "UPDATE_ELECTION_CANDIDATE", candidate.fullName, {
      ...auditContext(session, req),
      targetType: "ElectionCandidate",
      targetId: candidate.id,
      after: { fullName: candidate.fullName, photo: candidate.photo },
    });

    return NextResponse.json({ candidate });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/elections/[id]/candidates/[candidateId]",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireArea(ELECTIONS_AREA);
    const { id, candidateId } = await params;

    const candidate = await deleteCandidate(id, candidateId);

    await logAction(session.username, "DELETE_ELECTION_CANDIDATE", candidate.fullName, {
      ...auditContext(session, req),
      targetType: "ElectionCandidate",
      targetId: candidate.id,
      before: { fullName: candidate.fullName, photo: candidate.photo },
    });

    return NextResponse.json({ deleted: true });
  },
);
