import { getLeaderboardData, toPublicEntry, SUPPORTERS_PAGE_SIZE } from "@/lib/donationsServer";
import { supportersSummary } from "@/lib/supportersBoard";
import { currentViewer } from "@/lib/supportViewer";
import type { ActivityBoard } from "./ActivitySupporters";

export async function activityBoard(activityId: string): Promise<ActivityBoard> {
  const { leaderboard } = await getLeaderboardData(await currentViewer(), activityId);
  return {
    rows: leaderboard.slice(0, SUPPORTERS_PAGE_SIZE).map(toPublicEntry),
    total: leaderboard.length,
    given: supportersSummary(leaderboard).given,
  };
}
