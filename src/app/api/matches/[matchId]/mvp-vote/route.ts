import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { mvpVoteCastSchema } from "./schema";
import { isUniqueViolation } from "@/lib/prismaError";

export const POST = withRoute(
  "POST /api/matches/[matchId]/mvp-vote",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const session = await requireUser();
    const { matchId } = await params;
    const { candidateId } = parse(mvpVoteCastSchema, await req.json());

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
      if (isUniqueViolation(err)) {
        return NextResponse.json({ error: "لقد صوّتَ بالفعل في هذه المباراة" }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({ ok: true });
  },
);
