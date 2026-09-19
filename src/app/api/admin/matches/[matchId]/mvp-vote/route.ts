import { NextRequest, NextResponse } from "next/server";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { parse } from "@/lib/validation";
import { mvpVoteCreateSchema, mvpVoteStatusSchema } from "./schema";
import { notify, tournament } from "@/lib/messages";
import { ValidationError } from "@/lib/errors";
import { changeMvpVote, deleteMvpVote, openMvpVote } from "@/lib/mvpVoteServer";

export const POST = withRoute(
  "POST /api/admin/matches/[matchId]/mvp-vote",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);
    const { candidateMemberIds, minutes } = parse(mvpVoteCreateSchema, await req.json());

    const { vote, home, away, activityId } = await openMvpVote(
      matchId,
      candidateMemberIds,
      minutes,
    );

    await logAction(session.username, "OPEN_MVP_VOTE", `${home.name} × ${away.name}`);

    notifyTeams(home.id, away.id, notify.mvpVoteOpen(home.name, away.name, activityId)).catch(
      (err) => logger.error("mvp.vote.open.push.error", err),
    );

    return NextResponse.json({ vote }, { status: 201 });
  },
);

export const PATCH = withRoute(
  "PATCH /api/admin/matches/[matchId]/mvp-vote",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);
    const { status, minutes } = parse(mvpVoteStatusSchema, await req.json());
    if (status === undefined && minutes === undefined) {
      throw new ValidationError(tournament.voteNothingToChange);
    }

    const vote = await changeMvpVote(matchId, { status, minutes });

    await logAction(
      session.username,
      status === "CLOSED"
        ? "CLOSE_MVP_VOTE"
        : status === "OPEN"
          ? "REOPEN_MVP_VOTE"
          : "EXTEND_MVP_VOTE",
      matchId,
    );

    return NextResponse.json({ vote });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/matches/[matchId]/mvp-vote",
  async (_req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);

    await deleteMvpVote(matchId);
    await logAction(session.username, "DELETE_MVP_VOTE", matchId);

    return NextResponse.json({ ok: true });
  },
);
