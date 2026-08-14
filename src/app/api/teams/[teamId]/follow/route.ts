import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getUserSession } from "@/lib/auth";
import { withRoute } from "@/lib/route";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ following: false, loggedIn: false });
  const { teamId } = await params;
  const { userId } = session as { userId: string };
  const follow = await prisma.teamFollow.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  return NextResponse.json({ following: !!follow, loggedIn: true });
}

export const POST = withRoute(
  "POST /api/teams/[teamId]/follow",
  async (_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await requireUser();
    const { teamId } = await params;

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) {
      return NextResponse.json({ error: "الفريق غير موجود" }, { status: 404 });
    }

    await prisma.teamFollow.upsert({
      where: { userId_teamId: { userId: session.userId, teamId } },
      update: {},
      create: { userId: session.userId, teamId },
    });

    return NextResponse.json({ ok: true });
  },
);

export const DELETE = withRoute(
  "DELETE /api/teams/[teamId]/follow",
  async (_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await requireUser();
    const { teamId } = await params;

    await prisma.teamFollow.deleteMany({ where: { userId: session.userId, teamId } });

    return NextResponse.json({ ok: true });
  },
);
