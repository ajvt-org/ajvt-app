import type { WorkspaceSection, WorkspaceTab } from "@/components/admin/WorkspaceTabs";
import type { Visibility } from "@/lib/competitionConfig";
import { quizWorkspace as texts } from "@/lib/texts";

export interface TabbedCompetition {
  visibility: Visibility;
  startedAt: string | null;
}

function setupTabs(competition: TabbedCompetition | null): WorkspaceTab[] {
  const tabs: WorkspaceTab[] = [{ key: "settings", label: texts.tabs.settings, icon: "gear" }];
  if (!competition) return tabs;
  if (competition.visibility === "PRIVATE") {
    tabs.push({ key: "participants", label: texts.tabs.participants, icon: "users" });
  }
  tabs.push({ key: "rounds", label: texts.tabs.rounds, icon: "calendar" });
  return tabs;
}

function runTabs(competition: TabbedCompetition | null): WorkspaceTab[] {
  if (!competition?.startedAt) return [];
  return [
    { key: "standings", label: texts.tabs.standings, icon: "trophy" },
    { key: "scores", label: texts.tabs.scores, icon: "chart" },
  ];
}

export function competitionTabSections(competition: TabbedCompetition | null): WorkspaceSection[] {
  return [
    { key: "setup", label: texts.sections.setup, tabs: setupTabs(competition) },
    { key: "run", label: texts.sections.run, tabs: runTabs(competition) },
  ].filter((section) => section.tabs.length > 0);
}

export function openingTab(competition: TabbedCompetition | null): string {
  if (!competition) return "settings";
  return competition.startedAt ? "standings" : "rounds";
}
