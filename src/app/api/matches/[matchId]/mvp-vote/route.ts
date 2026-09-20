import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { mvpVoteCastSchema } from "./schema";
import { castMvpVote } from "@/lib/mvpVoteServer";

export const POST = withRoute(
  "POST /api/matches/[matchId]/mvp-vote",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const session = await requireUser();
    const { matchId } = await params;
    const { candidateId } = parse(mvpVoteCastSchema, await req.json());

    await castMvpVote(matchId, candidateId, session.userId);

    return NextResponse.json({ ok: true });
  },
);
