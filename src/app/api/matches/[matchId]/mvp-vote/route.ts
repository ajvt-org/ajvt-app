import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";

export const POST = withRoute(
  "POST /api/matches/[matchId]/mvp-vote",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const session = await requireUser();
    const { matchId } = await params;
    const { candidateId } = await req.json();

    if (!candidateId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const vote = await prisma.matchMvpVote.findUnique({
      where: { matchId },
      select: { id: true, status: true, candidates: { select: { id: true } } },
    });
    if (!vote) {
      return NextResponse.json({ error: "لا يوجد تصويت لهذه المباراة" }, { status: 404 });
    }
    if (vote.status !== "OPEN") {
      return NextResponse.json({ error: "التصويت مغلق" }, { status: 409 });
    }
    if (!vote.candidates.some((c) => c.id === candidateId)) {
      return NextResponse.json({ error: "لاعب غير موجود ضمن المرشحين" }, { status: 400 });
    }

    try {
      await prisma.mvpVote.create({
        data: { voteId: vote.id, candidateId, userId: session.userId },
      });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        return NextResponse.json({ error: "لقد صوّتَ بالفعل في هذه المباراة" }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({ ok: true });
  },
);
