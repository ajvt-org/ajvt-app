import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getUserSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ following: false, loggedIn: false });
  const { teamId } = await params;
  const { userId } = session as { userId: string };
  const follow = await prisma.teamFollow.findUnique({ where: { userId_teamId: { userId, teamId } } });
  return NextResponse.json({ following: !!follow, loggedIn: true });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
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
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Follow team error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await requireUser();
    const { teamId } = await params;

    await prisma.teamFollow.deleteMany({ where: { userId: session.userId, teamId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Unfollow team error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
