import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { ELECTIONS_AREA } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { createElection, listElections } from "@/lib/electionServer";
import { electionCreateSchema } from "./schema";

export const GET = withRoute("GET /api/admin/elections", async () => {
  await requireArea(ELECTIONS_AREA);

  return NextResponse.json({ elections: await listElections() });
});

export const POST = withRoute("POST /api/admin/elections", async (req: NextRequest) => {
  const session = await requireArea(ELECTIONS_AREA);
  const input = parse(electionCreateSchema, await req.json());

  const election = await createElection(input);

  await logAction(session.username, "CREATE_ELECTION", election.title, {
    ...auditContext(session, req),
    targetType: "Election",
    targetId: election.id,
    after: {
      title: election.title,
      startsAt: election.startsAt,
      durationMinutes: election.durationMinutes,
      hidden: election.hidden,
    },
  });

  return NextResponse.json({ election }, { status: 201 });
});
