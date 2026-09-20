import { NextRequest, NextResponse } from "next/server";
import { requireUser, getUserSession } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { followTeam, isFollowing, unfollowTeam } from "@/lib/teamFollowServer";

export const GET = withRoute(
  "GET /api/teams/[teamId]/follow",
  async (_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await getUserSession();
    if (!session) return NextResponse.json({ following: false, loggedIn: false });

    const { teamId } = await params;
    const { userId } = session as { userId: string };

    return NextResponse.json({ following: await isFollowing(userId, teamId), loggedIn: true });
  },
);

export const POST = withRoute(
  "POST /api/teams/[teamId]/follow",
  async (_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await requireUser();
    const { teamId } = await params;

    await followTeam(session.userId, teamId);

    return NextResponse.json({ ok: true });
  },
);

export const DELETE = withRoute(
  "DELETE /api/teams/[teamId]/follow",
  async (_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await requireUser();
    const { teamId } = await params;

    await unfollowTeam(session.userId, teamId);

    return NextResponse.json({ ok: true });
  },
);
