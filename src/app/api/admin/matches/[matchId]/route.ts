import { NextRequest, NextResponse } from "next/server";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { parse } from "@/lib/validation";
import { matchUpdateSchema } from "./schema";
import { notify } from "@/lib/messages";
import { updateMatch } from "@/lib/matchUpdateServer";
import { removeMatch } from "@/lib/matchAdminWriteServer";

export const PATCH = withRoute(
  "PATCH /api/admin/matches/[matchId]",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);

    const { match, report } = await updateMatch(
      matchId,
      parse(matchUpdateSchema, await req.json()),
    );
    if (!report) return NextResponse.json({ match });

    const { before, applied, homeName, awayName } = report;
    const target = { targetType: "Match" as const, targetId: matchId };

    if (report.forfeitTouched) {
      const winner = report.forfeitWinnerTeamId;
      const winnerName = winner === report.sides.first ? homeName : awayName;
      await logAction(
        session.username,
        winner ? "SET_MATCH_FORFEIT" : "CLEAR_MATCH_FORFEIT",
        `${homeName} × ${awayName}${winner ? ` — ${winnerName}` : ""}`,
        {
          ...auditContext(session, req),
          ...target,
          before: {
            forfeitWinnerTeamId: before.forfeitWinnerTeamId,
            forfeitExtraGoals: before.forfeitExtraGoals,
            homeScore: before.homeScore,
            awayScore: before.awayScore,
          },
          after: {
            forfeitWinnerTeamId: winner,
            forfeitExtraGoals: report.forfeitExtraGoals,
            homeScore: applied.homeScore,
            awayScore: applied.awayScore,
          },
        },
      );
    }

    if (report.resultEntered) {
      await logAction(
        session.username,
        "ENTER_MATCH_RESULT",
        `${homeName} ${applied.homeScore}-${applied.awayScore} ${awayName}`,
        {
          ...auditContext(session, req),
          ...target,
          before: {
            homeScore: before.homeScore,
            awayScore: before.awayScore,
            status: before.status,
          },
          after: {
            homeScore: applied.homeScore,
            awayScore: applied.awayScore,
            status: applied.status,
          },
        },
      );
      if (!report.wasPlayed) {
        notifyTeams(
          report.sides.first,
          report.sides.second,
          notify.matchResult(
            homeName,
            applied.homeScore!,
            applied.awayScore!,
            awayName,
            report.activityId,
            report.entrant,
          ),
        ).catch((err) => logger.error("match.result.push.error", err));
      }
    }

    return NextResponse.json({ match });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/matches/[matchId]",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);

    const { match, homeName, awayName } = await removeMatch(matchId);

    await logAction(session.username, "DELETE_MATCH", `${homeName} × ${awayName}`, {
      ...auditContext(session, req),
      targetType: "Match",
      targetId: matchId,
      before: {
        homeTeam: homeName,
        awayTeam: awayName,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        matchDate: match.matchDate,
      },
    });

    return NextResponse.json({ ok: true });
  },
);
