import type { WorkspaceSection, WorkspaceTab } from "@/components/admin/WorkspaceTabs";
import type { Visibility } from "@/lib/competitionConfig";
import { quizWorkspace as texts } from "@/lib/texts";

export interface TabbedCompetition {
  visibility: Visibility;
  startedAt: string | null;
}

function competitionTabs(competition: TabbedCompetition | null): WorkspaceTab[] {
  const tabs: WorkspaceTab[] = [{ key: "settings", label: texts.tabs.settings, icon: "gear" }];
  if (!competition) return tabs;
  if (competition.visibility === "PRIVATE") {
    tabs.push({ key: "participants", label: texts.tabs.participants, icon: "users" });
  }
  if (!competition.startedAt) return tabs;
  tabs.push({ key: "standings", label: texts.tabs.standings, icon: "trophy" });
  tabs.push({ key: "scores", label: texts.tabs.scores, icon: "chart" });
  return tabs;
}

export function competitionTabSections(competition: TabbedCompetition | null): WorkspaceSection[] {
  return [{ key: "competition", label: texts.section, tabs: competitionTabs(competition) }];
}

export function openingTab(competition: TabbedCompetition | null): string {
  return competition?.startedAt ? "standings" : "settings";
}
