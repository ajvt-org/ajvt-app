import type { WorkspaceTab } from "@/components/admin/WorkspaceTabs";
import { activityWorkspace as texts, discipline as disciplineTexts } from "@/lib/texts";

export interface TournamentShape {
  isTournament: boolean;
  profile: "FOOTBALL" | "BOARD";
  teamSize: number | null;
}

export const TOURNAMENT_TAB_KEYS = [
  "teams",
  "days",
  "matches",
  "standings",
  "scorers",
  "discipline",
] as const;

export type TournamentTabKey = (typeof TOURNAMENT_TAB_KEYS)[number];

export function isTournamentTab(key: string): key is TournamentTabKey {
  return (TOURNAMENT_TAB_KEYS as readonly string[]).includes(key);
}

export function tournamentRosterTab(
  shape: TournamentShape,
  pendingJoinRequests = 0,
): WorkspaceTab[] {
  if (!shape.isTournament) return [];
  const singles = shape.teamSize === 1;
  return [
    {
      key: "teams",
      label: singles ? texts.tabs.players : texts.tabs.teams,
      icon: singles ? "user" : "shield",
      badge: pendingJoinRequests,
    },
  ];
}

export function tournamentPlayTabs(
  shape: TournamentShape,
  pendingProposals: number,
): WorkspaceTab[] {
  if (!shape.isTournament) return [];
  const tabs: WorkspaceTab[] = [
    { key: "days", label: texts.tabs.days, icon: "calendar" },
    { key: "matches", label: texts.tabs.matches, icon: "swords" },
    { key: "standings", label: texts.tabs.standings, icon: "medal" },
    { key: "scorers", label: texts.tabs.scorers, icon: "chart" },
  ];
  if (shape.profile === "FOOTBALL") {
    tabs.push({
      key: "discipline",
      label: disciplineTexts.tab,
      icon: "ban",
      badge: pendingProposals,
    });
  }
  return tabs;
}
