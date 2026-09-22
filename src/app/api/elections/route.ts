import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { isPaidUpMember } from "@/lib/memberStanding";
import { ballotsOf, visibleElections } from "@/lib/electionViewServer";

export const GET = withRoute("GET /api/elections", async () => {
  const session = await getUserSession();
  const elections = await visibleElections();
  const userId = (session?.userId as string | undefined) ?? null;

  if (!userId) {
    return NextResponse.json({
      elections: elections.map((election) => ({ ...election, voted: false })),
      signedIn: false,
      canVote: false,
    });
  }

  const [voted, canVote] = await Promise.all([
    ballotsOf(
      userId,
      elections.map((election) => election.id),
    ),
    isPaidUpMember(userId),
  ]);

  return NextResponse.json({
    elections: elections.map((election) => ({ ...election, voted: voted.has(election.id) })),
    signedIn: true,
    canVote,
  });
});
