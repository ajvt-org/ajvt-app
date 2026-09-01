import type { WorkspaceSection, WorkspaceTab } from "@/components/admin/WorkspaceTabs";
import {
  tournamentPlayTabs,
  tournamentRosterTab,
  type TournamentShape,
} from "@/components/admin/tournament/tournamentTabs";
import { activityWorkspace as texts } from "@/lib/texts";

export interface TabbedActivity extends TournamentShape {
  isVolunteer: boolean;
  registrations: { status: string }[];
}

export const SECTION_KEYS = ["setup", "people", "play", "records"] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

const SECTION_LABEL: Record<SectionKey, string> = {
  setup: texts.sections.setup,
  people: texts.sections.people,
  play: texts.sections.play,
  records: texts.sections.records,
};

function registrationsTab(activity: TabbedActivity): WorkspaceTab[] {
  if (activity.isVolunteer && activity.registrations.length === 0) return [];
  const pending = activity.registrations.filter((r) => r.status === "PENDING").length;
  return [{ key: "registrations", label: texts.tabs.registrations, icon: "users", badge: pending }];
}

function tabsOf(
  section: SectionKey,
  activity: TabbedActivity,
  pendingProposals: number,
  pendingJoinRequests: number,
): WorkspaceTab[] {
  switch (section) {
    case "setup":
      return [{ key: "details", label: texts.tabs.details, icon: "pencil" }];
    case "people":
      return [...registrationsTab(activity), ...tournamentRosterTab(activity, pendingJoinRequests)];
    case "play":
      return tournamentPlayTabs(activity, pendingProposals);
    case "records":
      return [
        { key: "finance", label: texts.tabs.finance, icon: "wallet" },
        { key: "log", label: texts.tabs.log, icon: "list" },
      ];
  }
}

export function activityTabSections(
  activity: TabbedActivity,
  pendingProposals: number,
  pendingJoinRequests = 0,
): WorkspaceSection[] {
  return SECTION_KEYS.map((key) => ({
    key,
    label: SECTION_LABEL[key],
    tabs: tabsOf(key, activity, pendingProposals, pendingJoinRequests),
  })).filter((section) => section.tabs.length > 0);
}

export function activityTabs(
  activity: TabbedActivity,
  pendingProposals: number,
  pendingJoinRequests = 0,
): WorkspaceTab[] {
  return activityTabSections(activity, pendingProposals, pendingJoinRequests).flatMap(
    (section) => section.tabs,
  );
}
