import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { isPaidUpMember } from "@/lib/memberStanding";
import { myBallot, visibleElection } from "@/lib/electionViewServer";
import { candidateOrderFor } from "@/lib/electionBallot";

type Params = { params: Promise<{ id: string }> };

export const GET = withRoute(
  "GET /api/elections/[id]",
  async (_req: NextRequest, { params }: Params) => {
    const { id } = await params;
    const session = await getUserSession();
    const election = await visibleElection(id);
    const userId = (session?.userId as string | undefined) ?? null;

    const [ballot, canVote] = await Promise.all([
      userId ? myBallot(userId, id) : Promise.resolve(null),
      userId ? isPaidUpMember(userId) : Promise.resolve(false),
    ]);

    return NextResponse.json({
      election: {
        ...election,
        candidates: candidateOrderFor(election, election.candidates, userId),
      },
      signedIn: userId !== null,
      canVote,
      myCandidateId: ballot ? ballot.candidateId : null,
      voted: ballot !== null,
    });
  },
);
