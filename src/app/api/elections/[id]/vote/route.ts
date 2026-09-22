import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { ForbiddenError } from "@/lib/errors";
import { isPaidUpMember } from "@/lib/memberStanding";
import { castBallot } from "@/lib/electionViewServer";
import { elections } from "@/lib/messages";

type Params = { params: Promise<{ id: string }> };

const voteSchema = z.object({ candidateId: z.string().nullable() });

export const POST = withRoute(
  "POST /api/elections/[id]/vote",
  async (req: NextRequest, { params }: Params) => {
    const { id } = await params;
    const session = await requireUser();
    if (!(await isPaidUpMember(session.userId))) throw new ForbiddenError(elections.membersOnly);

    const { candidateId } = parse(voteSchema, await req.json());
    await castBallot(id, session.userId, candidateId);

    return NextResponse.json({ voted: true }, { status: 201 });
  },
);
