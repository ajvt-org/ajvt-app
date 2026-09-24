import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { ELECTIONS_AREA } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { requireElection, updateElection } from "@/lib/electionServer";
import { deleteElection } from "@/lib/electionArchiveServer";
import { electionUpdateSchema } from "../schema";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/admin/elections/[id]",
  async (_req: NextRequest, { params }: Params) => {
    await requireArea(ELECTIONS_AREA);
    const { id } = await params;

    return NextResponse.json({ election: await requireElection(id) });
  },
);

export const PATCH = withRoute(
  "PATCH /api/admin/elections/[id]",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireArea(ELECTIONS_AREA);
    const { id } = await params;
    const input = parse(electionUpdateSchema, await req.json());

    const { election, actions } = await updateElection(id, input);

    for (const action of actions) {
      await logAction(session.username, action, election.title, {
        ...auditContext(session, req),
        targetType: "Election",
        targetId: election.id,
        after: {
          title: election.title,
          startsAt: election.startsAt,
          durationMinutes: election.durationMinutes,
          hidden: election.hidden,
          showResults: election.showResults,
        },
      });
    }

    return NextResponse.json({ election });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/elections/[id]",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireArea(ELECTIONS_AREA);
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const typed = String(body?.confirmTitle ?? "");

    const election = await deleteElection(id, typed, session.username);

    await logAction(session.username, "DELETE_ELECTION", election.title, {
      ...auditContext(session, req),
      targetType: "Election",
      targetId: election.id,
      before: {
        title: election.title,
        startsAt: election.startsAt,
        durationMinutes: election.durationMinutes,
        ballots: election.ballots.length,
      },
    });

    return NextResponse.json({ deleted: true });
  },
);
